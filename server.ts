import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;
const db = new Database("top5.db");

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    spotify_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    image_url TEXT,
    spotify_image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS top_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    song_title TEXT,
    artist_name TEXT,
    rank INTEGER,
    type TEXT, -- 'weekly', 'monthly', or 'all-time'
    spotify_url TEXT,
    preview_url TEXT,
    album_art_url TEXT,
    UNIQUE(user_id, rank, type)
  );

  CREATE TABLE IF NOT EXISTS friendships (
    user_id TEXT,
    friend_id TEXT,
    PRIMARY KEY (user_id, friend_id)
  );
`);

// Migration: Add image_url to users if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN image_url TEXT;");
} catch (e) {}

// Migration: Add spotify_image_url to users if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN spotify_image_url TEXT;");
} catch (e) {}

// Migration: Add spotify_url and preview_url to top_songs if they don't exist
try {
  db.exec("ALTER TABLE top_songs ADD COLUMN spotify_url TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE top_songs ADD COLUMN preview_url TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE top_songs ADD COLUMN album_art_url TEXT;");
} catch (e) {}

app.use(express.json());
app.use(cookieParser());

// Spotify Config
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.APP_URL}/auth/spotify/callback`;

async function refreshSpotifyToken(userId: string) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user || !user.refresh_token) return null;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refresh_token,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      db.prepare("UPDATE users SET access_token = ? WHERE id = ?").run(data.access_token, userId);
      return data.access_token;
    }
  } catch (e) {
    console.error("Failed to refresh Spotify token", e);
  }
  return null;
}

// --- Spotify Auth Routes ---

app.get("/api/auth/spotify/url", (req, res) => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({ error: "Spotify Client ID or Secret is missing in environment variables." });
  }
  if (!process.env.APP_URL) {
    return res.status(500).json({ error: "APP_URL is missing in environment variables. This is required for the redirect URI." });
  }

  const scope = "user-top-read user-read-email user-read-private";
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: scope,
    show_dialog: "true",
  });
  res.json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
});

app.get("/auth/spotify/callback", async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error("Spotify Auth Callback Error:", error);
    if (error === "access_denied") {
      return res.status(400).send(`
        <html>
          <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center;">
            <div>
              <h1 style="color: #1DB954;">Connection Cancelled</h1>
              <p>It looks like you cancelled the Spotify connection.</p>
              <button onclick="window.close()" style="background: #1DB954; color: #000; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; margin-top: 20px;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }
    return res.status(400).send(`Authentication failed: ${error}`);
  }

  if (!code) return res.status(400).send("No code provided");

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();
    
    // Get user info from Spotify
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const spotifyUser = await userResponse.json();

    // Save or update user
    const userId = spotifyUser.id;
    const imageUrl = spotifyUser.images?.[0]?.url || null;

    db.prepare(`
      INSERT INTO users (id, email, display_name, spotify_id, access_token, refresh_token, image_url, spotify_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        display_name = excluded.display_name,
        image_url = COALESCE(users.image_url, excluded.image_url),
        spotify_image_url = excluded.spotify_image_url
    `).run(userId, spotifyUser.email, spotifyUser.display_name, spotifyUser.id, tokens.access_token, tokens.refresh_token, imageUrl, imageUrl);

    res.cookie("userId", userId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      // @ts-ignore
      partitioned: true,
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Spotify Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("userId", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    // @ts-ignore
    partitioned: true,
  });
  res.clearCookie("userId", { path: "/" });
  res.json({ success: true });
});

// --- API Routes ---

app.get("/api/me", (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    ...user,
    app_url: process.env.APP_URL
  });
});

app.get("/api/top-songs", (req, res) => {
  const userId = req.query.userId || req.cookies.userId;
  const type = req.query.type || "weekly";
  
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const songs = db.prepare("SELECT * FROM top_songs WHERE user_id = ? AND type = ? ORDER BY rank ASC").all(userId, type);
  res.json(songs);
});

app.post("/api/top-songs", (req, res) => {
  const userId = req.cookies.userId;
  const { songs, type } = req.body; // songs: [{title, artist, rank, spotify_url, preview_url, album_art_url}]

  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const deleteStmt = db.prepare("DELETE FROM top_songs WHERE user_id = ? AND type = ?");
  const insertStmt = db.prepare("INSERT INTO top_songs (user_id, song_title, artist_name, rank, type, spotify_url, preview_url, album_art_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

  const transaction = db.transaction(() => {
    deleteStmt.run(userId, type);
    for (const song of songs) {
      insertStmt.run(userId, song.title, song.artist, song.rank, type, song.spotify_url, song.preview_url, song.album_art_url);
    }
  });

  transaction();
  res.json({ success: true });
});

app.get("/api/friends", (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const friends = db.prepare(`
    SELECT u.id, u.display_name, u.image_url, u.email
    FROM users u
    JOIN friendships f ON u.id = f.friend_id
    WHERE f.user_id = ?
  `).all(userId);

  res.json(friends);
});

app.post("/api/friends/add", (req, res) => {
  const userId = req.cookies.userId;
  const { friendId } = req.body;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (userId === friendId) return res.status(400).json({ error: "Cannot add yourself" });

  try {
    const transaction = db.transaction(() => {
      db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)").run(userId, friendId);
      db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)").run(friendId, userId);
    });
    transaction();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to add friend" });
  }
});

app.post("/api/friends/connect", (req, res) => {
  const userId = req.cookies.userId;
  const { inviterId } = req.body;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (userId === inviterId) return res.json({ success: true, message: "Self-invite ignored" });

  try {
    const transaction = db.transaction(() => {
      db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)").run(userId, inviterId);
      db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)").run(inviterId, userId);
    });
    transaction();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to connect with friend" });
  }
});

app.get("/api/users/search", (req, res) => {
  const query = req.query.q as string;
  const userId = req.cookies.userId;
  if (!query) return res.json([]);

  const users = db.prepare(`
    SELECT id, display_name, image_url 
    FROM users 
    WHERE (display_name LIKE ? OR email LIKE ?) AND id != ?
    LIMIT 10
  `).all(`%${query}%`, `%${query}%`, userId);

  // Add demo user to search results if it matches
  const lowerQuery = query.toLowerCase();
  if ("Alex (Demo Friend)".toLowerCase().includes(lowerQuery) || "demo".includes(lowerQuery) || "alex".includes(lowerQuery)) {
    users.push({
      id: "demo-friend-id",
      display_name: "Alex (Demo Friend)",
      image_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=b6e3f4"
    } as any);
  }

  res.json(users);
});

app.get("/api/spotify/search", async (req, res) => {
  const userId = req.cookies.userId;
  const trackName = req.query.track as string;
  const artistName = req.query.artist as string;
  
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!trackName) return res.status(400).json({ error: "No track name provided" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    let accessToken = user.access_token;
    
    const trySearch = async (query: string) => {
      let response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        accessToken = await refreshSpotifyToken(userId);
        if (accessToken) {
          response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      }
      return response;
    };

    // Try 1: Specific search with filters
    let query = artistName ? `track:${trackName} artist:${artistName}` : `track:${trackName}`;
    let response = await trySearch(query);
    let data = await response.json();
    let track = data.tracks?.items?.[0];

    // Try 2: Broader search if Try 1 failed
    if (!track && artistName) {
      query = `${trackName} ${artistName}`;
      response = await trySearch(query);
      data = await response.json();
      track = data.tracks?.items?.[0];
    }

    // Try 3: Just track name if Try 2 failed
    if (!track) {
      query = trackName;
      response = await trySearch(query);
      data = await response.json();
      track = data.tracks?.items?.[0];
    }

    if (track) {
      res.json({
        preview_url: track.preview_url,
        spotify_url: track.external_urls.spotify,
        album_art_url: track.album?.images?.[0]?.url
      });
    } else {
      res.status(404).json({ error: "No track found" });
    }
  } catch (e) {
    console.error("Search error:", e);
    res.status(500).json({ error: "Failed to search Spotify" });
  }
});

// --- AI Routes ---

app.post("/api/spotify/sync", async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    // 1. Fetch Top Tracks from Spotify
    const fetchSpotifyTop = async (timeRange: string) => {
      let accessToken = user.access_token;
      let response = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=5`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        accessToken = await refreshSpotifyToken(userId);
        if (accessToken) {
          response = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=5`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      }

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.statusText}`);
      }
      return await response.json();
    };

    // Fetch Recently Played for "Weekly" approximation
    const fetchRecentlyPlayed = async () => {
      let accessToken = user.access_token;
      let response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        accessToken = await refreshSpotifyToken(userId);
        if (accessToken) {
          response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      }

      if (!response.ok) return [];
      const data = await response.json();
      
      // Aggregate top 5 from the last 50 tracks
      const counts: Record<string, { count: number; track: any }> = {};
      if (data.items) {
        data.items.forEach((item: any) => {
          const id = item.track.id;
          if (!counts[id]) {
            counts[id] = { count: 0, track: item.track };
          }
          counts[id].count++;
        });
      }

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((item, index) => ({
          song_title: item.track.name,
          artist_name: item.track.artists[0].name,
          rank: index + 1,
          spotify_url: item.track.external_urls.spotify,
          preview_url: item.track.preview_url,
          album_art_url: item.track.album?.images?.[0]?.url
        }));
    };

    const [recentlyPlayedSongs, monthlyData, allTimeData] = await Promise.all([
      fetchRecentlyPlayed(),
      fetchSpotifyTop("short_term"), // 4 weeks -> monthly
      fetchSpotifyTop("long_term") // years -> all-time
    ]);

    // Fallback for weekly: if recently played is empty, use short_term but label as weekly
    const weeklySongs = recentlyPlayedSongs.length > 0 ? recentlyPlayedSongs : monthlyData.items.map((item: any, index: number) => ({
      song_title: item.name,
      artist_name: item.artists[0].name,
      rank: index + 1,
      spotify_url: item.external_urls.spotify,
      preview_url: item.preview_url,
      album_art_url: item.album?.images?.[0]?.url
    }));

    const monthlySongs = monthlyData.items.map((item: any, index: number) => ({
      song_title: item.name,
      artist_name: item.artists[0].name,
      rank: index + 1,
      spotify_url: item.external_urls.spotify,
      preview_url: item.preview_url,
      album_art_url: item.album?.images?.[0]?.url
    }));

    const allTimeSongs = allTimeData.items.map((item: any, index: number) => ({
      song_title: item.name,
      artist_name: item.artists[0].name,
      rank: index + 1,
      spotify_url: item.external_urls.spotify,
      preview_url: item.preview_url,
      album_art_url: item.album?.images?.[0]?.url
    }));

    // 2. Update Database
    const deleteStmt = db.prepare("DELETE FROM top_songs WHERE user_id = ?");
    const insertStmt = db.prepare("INSERT INTO top_songs (user_id, song_title, artist_name, rank, type, spotify_url, preview_url, album_art_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    const transaction = db.transaction(() => {
      deleteStmt.run(userId);
      for (const s of weeklySongs) insertStmt.run(userId, s.song_title, s.artist_name, s.rank, "weekly", s.spotify_url, s.preview_url, s.album_art_url);
      for (const s of monthlySongs) insertStmt.run(userId, s.song_title, s.artist_name, s.rank, "monthly", s.spotify_url, s.preview_url, s.album_art_url);
      for (const s of allTimeSongs) insertStmt.run(userId, s.song_title, s.artist_name, s.rank, "all-time", s.spotify_url, s.preview_url, s.album_art_url);
    });
    transaction();

    // 3. AI Analysis
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = "gemini-3-flash-preview";

    res.json({
      weekly_top5: weeklySongs,
      monthly_top5: monthlySongs,
      all_time_top5: allTimeSongs
    });

  } catch (error) {
    console.error("Sync Error:", error);
    res.status(500).json({ error: "Failed to sync with Spotify" });
  }
});

// AI analysis and comparison are now handled on the frontend.

app.get("/api/friends/activity", (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const activity = db.prepare(`
    SELECT u.id, u.display_name, u.image_url, s.song_title, s.artist_name, s.rank, s.type, s.album_art_url, s.spotify_url, s.preview_url
    FROM users u
    JOIN friendships f ON u.id = f.friend_id
    JOIN top_songs s ON u.id = s.user_id
    WHERE f.user_id = ?
    ORDER BY u.display_name, s.rank ASC
  `).all(userId);

  // Group by user
  const grouped = activity.reduce((acc: any, curr: any) => {
    if (!acc[curr.id]) {
      acc[curr.id] = {
        id: curr.id,
        display_name: curr.display_name,
        image_url: curr.image_url,
        songs: []
      };
    }
    acc[curr.id].songs.push({
      song_title: curr.song_title,
      artist_name: curr.artist_name,
      rank: curr.rank,
      type: curr.type,
      album_art_url: curr.album_art_url,
      spotify_url: curr.spotify_url,
      preview_url: curr.preview_url
    });
    return acc;
  }, {});

  const result = Object.values(grouped);
  res.json(result);
});

app.post("/api/user/update-image", (req, res) => {
  const userId = req.cookies.userId;
  const { imageUrl } = req.body;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  db.prepare("UPDATE users SET image_url = ? WHERE id = ?").run(imageUrl, userId);
  res.json({ success: true });
});

app.post("/api/user/sync-profile", async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    let accessToken = user.access_token;
    let response = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      accessToken = await refreshSpotifyToken(userId);
      if (accessToken) {
        response = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    }

    const spotifyUser = await response.json();
    const imageUrl = spotifyUser.images?.[0]?.url || null;

    db.prepare("UPDATE users SET image_url = ?, spotify_image_url = ?, display_name = ? WHERE id = ?").run(imageUrl, imageUrl, spotifyUser.display_name, userId);
    res.json({ image_url: imageUrl, display_name: spotifyUser.display_name });
  } catch (e) {
    console.error("Sync profile error:", e);
    res.status(500).json({ error: "Failed to sync profile" });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
