import { GoogleGenAI } from "@google/genai";
import { VibeRecommendation, TopSong, VibeMode } from "../types/vibe";

export async function generateVibeRecommendation(
  songs: TopSong[],
  mode: VibeMode,
  history: string[] = []
): Promise<VibeRecommendation> {
  // Check for both possible environment variable names
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please select an API key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const songList = songs.map(s => `${s.song_title} - ${s.artist_name}`).join("\n");
  const listType = mode === "weekly" ? "Weekly" : "All-Time";
  
  const prompt = `User's ${listType} Top 5 Songs:
${songList}

Task:
1. Analyze the musical DNA of this list (genres, tempo, mood, era, cultural context).
2. Recommend ONE well-known song that perfectly fits this vibe but is NOT in the user's list.
3. The recommendation MUST be a different song than these previously recommended ones: ${history.join(", ") || "None"}.
4. This is for the ${listType} list. ${listType === "Weekly" ? "Focus on current trends and fresh vibes." : "Focus on timeless classics and core musical identity."}

Output MUST be a valid JSON object with this exact structure:
{
  "recommended_song_title": "Song Title",
  "recommended_artist": "Artist Name",
  "short_vibe_explanation": "2-3 sentences max, engaging and personal, explaining why this fits their vibe."
}

Random seed for variety: ${Math.random()}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a world-class music curator and cultural analyst. Your goal is to analyze a user's top songs and provide a highly relevant, vibe-matching recommendation. Be creative but stick to well-known tracks for better compatibility. Output ONLY the JSON object.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    let data;
    try {
      data = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        console.error("AI Response Text:", text);
        throw new Error("Failed to parse AI response");
      }
    }

    // Fetch Spotify data
    const spotifyData = await fetchSpotifyMetadata(data.recommended_song_title, data.recommended_artist);

    return {
      ...data,
      ...spotifyData
    };
  } catch (error: any) {
    console.error("Vibe Service Error:", error);
    throw error;
  }
}

async function fetchSpotifyMetadata(track: string, artist: string) {
  try {
    const res = await fetch(`/api/spotify/search?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        spotify_track_url: data.spotify_url || `https://open.spotify.com/search/${encodeURIComponent(track + " " + artist)}`,
        album_cover_image_url: data.album_art_url || `https://picsum.photos/seed/${encodeURIComponent(track)}/400`,
        preview_url: data.preview_url
      };
    }
  } catch (e) {
    console.error("Spotify search failed", e);
  }

  return {
    spotify_track_url: `https://open.spotify.com/search/${encodeURIComponent(track + " " + artist)}`,
    album_cover_image_url: `https://picsum.photos/seed/${encodeURIComponent(track)}/400`
  };
}
