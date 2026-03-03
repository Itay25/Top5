import React, { useState, useEffect } from "react";
import { 
  Music, 
  Share2, 
  Users, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  LogOut,
  UserPlus,
  ArrowRightLeft,
  Loader2,
  Play,
  Pause,
  X,
  Check,
  RefreshCw,
  Download,
  Instagram,
  Share,
} from "lucide-react";
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { TopSong } from "./types/vibe";
import { Song, User, AIComparison } from "./types";

const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.API_KEY;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [activeTab, setActiveTab] = useState<"weekly" | "all-time">("weekly");
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendModalTab, setFriendModalTab] = useState<"weekly" | "all-time">("weekly");
  const [comparingFriend, setComparingFriend] = useState<User | null>(null);
  const [comparisonResult, setComparisonResult] = useState<AIComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [view, setView] = useState<"home" | "friends">("home");
  const [friendsActivity, setFriendsActivity] = useState<any[]>([]);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const togglePlay = (url: string) => {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingUrl(null);
      audioRef.current = audio;
      setPlayingUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTopSongs();
      fetchFriends();
      if (view === "friends") fetchFriendsActivity();
    }
  }, [user, activeTab, view]);

  useEffect(() => {
    // Mode changed
  }, [activeTab]);

  const [isRefreshingActivity, setIsRefreshingActivity] = useState(false);
  const fetchFriendsActivity = async () => {
    setIsRefreshingActivity(true);
    try {
      const res = await fetch("/api/friends/activity");
      if (res.ok) {
        const data = await res.json();
        setFriendsActivity(data);
        
        // Update selected friend if modal is open
        if (selectedFriend) {
          const updatedFriend = data.find((f: any) => f.id === selectedFriend.id);
          if (updatedFriend) {
            setSelectedFriend(updatedFriend);
          }
        }
      }
    } catch (e) {
      console.error("Fetch activity error", e);
    } finally {
      setIsRefreshingActivity(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitialSynced, setHasInitialSynced] = useState(false);

  const searchUsers = async (q: string) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setIsSearching(false);
    }
  };

  const syncWithSpotify = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        let songs = [];
        if (activeTab === "weekly") songs = data.weekly_top5;
        else songs = data.all_time_top5;
        
        setTopSongs(songs);
      } else {
        console.error("Failed to sync with Spotify");
      }
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (user && !hasInitialSynced) {
      syncWithSpotify();
      setHasInitialSynced(true);
    }
  }, [user]);

  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  const avatars = [
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Panda&backgroundColor=b6e3f4&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Koala&backgroundColor=ffdfbf&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Dog&backgroundColor=c0aede&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Cat&backgroundColor=d1d4f9&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Rabbit&backgroundColor=ffd5dc&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Lion&backgroundColor=b6e3f4&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Tiger&backgroundColor=ffdfbf&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Elephant&backgroundColor=c0aede&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Fox&backgroundColor=d1d4f9&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Owl&backgroundColor=ffd5dc&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Sloth&backgroundColor=b6e3f4&v=11",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Bear&backgroundColor=ffdfbf&v=11",
  ];

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const downloadStory = async () => {
    const element = document.getElementById('instagram-story-content');
    if (!element) return;
    
    setIsGeneratingImage(true);
    try {
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `Top5-Story-${new Date().toLocaleString('default', { month: 'long' })}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 200 : scrollLeft + 200;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const updateProfileImage = async (url: string) => {
    try {
      const res = await fetch("/api/user/update-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (res.ok) {
        setUser({ ...user!, image_url: url });
        setShowAvatarPicker(false);
      }
    } catch (e) {
      console.error("Failed to update profile image", e);
    }
  };

  const syncProfileFromSpotify = async () => {
    setIsSyncingProfile(true);
    try {
      const res = await fetch("/api/user/sync-profile", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUser({ ...user!, image_url: data.image_url, display_name: data.display_name });
        setShowAvatarPicker(false);
      }
    } catch (e) {
      console.error("Failed to sync profile", e);
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error("Fetch user error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopSongs = async () => {
    try {
      const res = await fetch(`/api/top-songs?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setTopSongs(data);
      }
    } catch (e) {
      console.error("Fetch songs error", e);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (e) {
      console.error("Fetch friends error", e);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if possible, but '*' is used in server.ts for flexibility in preview
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        fetchUser();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSpotifyConnect = async () => {
    const isIframe = window.self !== window.top;
    const origin = window.location.origin;

    if (isIframe) {
      // In Editor/Iframe: MUST use popup to avoid breaking the editor
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        "about:blank",
        "spotify_auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert("Popup blocked! Please allow popups for this site to connect with Spotify.");
        return;
      }

      try {
        const res = await fetch(`/api/auth/spotify/url?origin=${encodeURIComponent(origin)}`);
        if (!res.ok) {
          const error = await res.json();
          authWindow.close();
          throw new Error(error.message || "Failed to get auth URL");
        }
        const { url } = await res.json();
        authWindow.location.href = url;
      } catch (e: any) {
        console.error("Spotify connect error", e);
        authWindow.close();
        alert(`Connection error: ${e.message || "Please check your Spotify Client ID and Secret."}`);
      }
    } else {
      // Standalone/Mobile: Use direct redirect for maximum reliability
      try {
        const res = await fetch(`/api/auth/spotify/url?origin=${encodeURIComponent(origin)}`);
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to get auth URL");
        }
        const { url } = await res.json();
        window.location.href = url;
      } catch (e: any) {
        console.error("Spotify connect error", e);
        alert(`Connection error: ${e.message || "Please check your Spotify Client ID and Secret."}`);
      }
    }
  };

  const saveSongs = async (songsToSave: Song[]) => {
    try {
      await fetch("/api/top-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          songs: songsToSave.map(s => ({ 
            title: s.song_title, 
            artist: s.artist_name, 
            rank: s.rank,
            spotify_url: s.spotify_url,
            preview_url: s.preview_url,
            album_art_url: s.album_art_url
          })), 
          type: activeTab 
        }),
      });
      fetchTopSongs();

      // Copy to clipboard logic
      const songListText = songsToSave
        .sort((a, b) => a.rank - b.rank)
        .map((s, i) => `${i + 1}. ${s.song_title} - ${s.artist_name}`)
        .join("\n");
      
      const shareText = `Look at my top 5 ${activeTab === 'weekly' ? 'this week' : 'all time'}:\n${songListText}\n\nCheck it out on Top5: ${user?.app_url || window.location.origin}`;
      
      try {
        await navigator.clipboard.writeText(shareText);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } catch (err) {
        // Fallback for clipboard
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (e) {
      console.error("Save songs error", e);
      alert("Failed to save list.");
    }
  };

  const addSong = () => {
    if (topSongs.length >= 5) return;
    const newSong: Song = {
      song_title: "",
      artist_name: "",
      rank: topSongs.length + 1,
    };
    setTopSongs([...topSongs, newSong]);
  };

  const updateSong = (index: number, field: keyof Song, value: string) => {
    const updated = [...topSongs];
    updated[index] = { ...updated[index], [field]: value };
    setTopSongs(updated);
  };

  const removeSong = (index: number) => {
    const updated = topSongs.filter((_, i) => i !== index).map((s, i) => ({ ...s, rank: i + 1 }));
    setTopSongs(updated);
  };

  const compareWithFriend = async (friend: User) => {
    setComparingFriend(friend);
    setIsComparing(true);
    setComparisonResult(null);
    try {
      // Fetch friend's songs first
      const friendSongsRes = await fetch(`/api/top-songs?userId=${friend.id}&type=${activeTab}`);
      const friendSongs = await friendSongsRes.json();
      
      if (friendSongs.length === 0) {
        alert("Friend hasn't set their Top 5 yet!");
        setComparingFriend(null);
        return;
      }

      const apiKey = getGeminiKey();
      if (!apiKey) {
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
          // Retry after key selection
          compareWithFriend(friend);
          return;
        }
        throw new Error("API key missing");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const list1 = topSongs.map(s => `${s.song_title} - ${s.artist_name}`).join("\n");
      const list2 = friendSongs.map((s: any) => `${s.song_title} - ${s.artist_name}`).join("\n");

      const prompt = `
        User 1 (${user?.display_name}) Top 5 (${friendModalTab}):
        ${list1}

        User 2 (${friend.display_name}) Top 5 (${friendModalTab}):
        ${list2}

        Analyze the similarity in musical taste between these two users based on their Top 5 lists. 
        Consider genres, artists, and specific songs.
        Provide a compatibility score from 1 to 10, a concise explanation (max 30 words), and suggest ONE specific song (Title - Artist) that both users would likely enjoy based on their combined tastes.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `
            You are the AI engine for 'Top5' music app. 
            Analyze the similarity and generate a JSON response.
            Rules:
            - Score: 1-10.
            - Explanation: max 30 words.
            - Recommendation: ONE song (Title - Artist).
            - No emojis.
            - Output JSON schema:
            {
              "score": number,
              "explanation": "string",
              "recommendation": "string"
            }
          `,
        }
      });

      const data = JSON.parse(response.text);
      setComparisonResult({
        score: data.score,
        explanation: data.explanation,
        recommendation: data.recommendation
      });
    } catch (e) {
      console.error("Comparison error", e);
    } finally {
      setIsComparing(false);
    }
  };

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get('invite') || params.get('friendId');
      if (inviteId && inviteId !== user.id) {
        connectWithFriend(inviteId);
        // Clean up URL to prevent re-adding on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [user]);

  const calculateCompatibility = (mySongs: Song[], friendSongs: any[]) => {
    if (friendSongs.length === 0) return 0;

    let score = 0;
    friendSongs.forEach((fs: any) => {
      // Exact match (Title + Artist)
      const exactMatch = mySongs.find(ms => 
        ms.song_title.toLowerCase() === fs.song_title.toLowerCase() && 
        ms.artist_name.toLowerCase() === fs.artist_name.toLowerCase()
      );

      if (exactMatch) {
        // Base 15 points for exact match
        // Bonus up to 5 points if ranks are close
        const rankDiff = Math.abs(exactMatch.rank - fs.rank);
        score += 15 + (5 - rankDiff);
      } else {
        // Artist match
        const artistMatch = mySongs.find(ms => 
          ms.artist_name.toLowerCase() === fs.artist_name.toLowerCase()
        );
        if (artistMatch) {
          score += 8;
        }
      }
    });

    // Bonus for sharing the same #1
    const myTop = mySongs.find(s => s.rank === 1);
    const friendTop = friendSongs.find((s: any) => s.rank === 1);
    if (myTop && friendTop && 
        myTop.song_title.toLowerCase() === friendTop.song_title.toLowerCase() &&
        myTop.artist_name.toLowerCase() === friendTop.artist_name.toLowerCase()) {
      score += 10;
    }

    return Math.min(100, score);
  };

  const getRecommendation = (mySongs: Song[], friendSongs: any[]) => {
    // Simple logic: find a song in friend's list that I don't have
    const mySongTitles = new Set(mySongs.map(s => s.song_title.toLowerCase()));
    const recommendation = friendSongs.find(fs => !mySongTitles.has(fs.song_title.toLowerCase()));
    return recommendation || friendSongs[0];
  };

  const connectWithFriend = async (inviterId: string) => {
    try {
      const res = await fetch("/api/friends/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviterId }),
      });
      if (res.ok) {
        fetchFriends();
        fetchFriendsActivity();
      }
    } catch (e) {
      console.error("Connect friend error", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-[#1DB954] rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(29,185,84,0.3)]">
              <Music className="w-10 h-10 text-black" />
            </div>
            <h1 className="text-6xl font-black tracking-tighter italic">Top<span className="text-[#1DB954]">5</span></h1>
            <p className="text-zinc-400 text-lg font-medium">Your musical identity, curated and shared.</p>
          </div>

          <button 
            onClick={handleSpotifyConnect}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 rounded-full flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-lg"
          >
            <Music className="w-5 h-5 fill-current" />
            Connect with Spotify
          </button>
          
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Powered by Spotify API</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="border-b border-white/5 p-4 sm:p-6 flex justify-between items-center sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView("home")}>
            <div className="relative flex items-baseline">
              <span className="text-2xl font-black tracking-tighter text-white">Top</span>
              <span className="text-2xl font-black tracking-tighter text-[#1DB954]">5</span>
              <Sparkles className="w-3 h-3 text-[#1DB954] absolute -top-1 -right-4 animate-pulse" />
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 ml-4">
            <button 
              onClick={() => setView("home")}
              className={`relative py-2 text-sm font-bold transition-colors duration-300 ${view === "home" ? "text-white" : "text-zinc-500 hover:text-white"}`}
            >
              My Top5
              {view === "home" && (
                <motion.div 
                  layoutId="navUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button 
              onClick={() => setView("friends")}
              className={`relative py-2 text-sm font-bold transition-colors duration-300 ${view === "friends" ? "text-white" : "text-zinc-500 hover:text-white"}`}
            >
              Friends
              {view === "friends" && (
                <motion.div 
                  layoutId="navUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowProfileModal(true)}
            className="relative group"
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#1DB954] overflow-hidden bg-zinc-800 flex items-center justify-center transition-all group-hover:shadow-[0_0_15px_rgba(29,185,84,0.4)]">
              {user.image_url ? (
                <img 
                  src={user.image_url} 
                  alt={user.display_name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-lg font-bold text-zinc-500">{user.display_name.charAt(0)}</span>
              )}
            </div>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowExitModal(true)}
            className="p-2 hover:text-red-500 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5 text-zinc-400" />
          </motion.button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 pb-24 md:pb-6">
        <AnimatePresence mode="wait">
          {view === "home" ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
            >
              {/* Top 5 Editor */}
              <div className="lg:col-span-12 space-y-6 lg:space-y-8 max-w-3xl mx-auto w-full">
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setActiveTab("weekly")}
                        className={`text-2xl font-bold tracking-tight transition-opacity ${activeTab === "weekly" ? "opacity-100" : "opacity-30 hover:opacity-50"}`}
                      >
                        Weekly
                      </button>
                      <button 
                        onClick={() => setActiveTab("all-time")}
                        className={`text-2xl font-bold tracking-tight transition-opacity ${activeTab === "all-time" ? "opacity-100" : "opacity-30 hover:opacity-50"}`}
                      >
                        All-time
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={syncWithSpotify}
                        disabled={isSyncing}
                        className="flex-1 sm:flex-none bg-[#1DB954] text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#1ed760] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Syncing..." : "Refresh"}
                      </button>
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => saveSongs(topSongs)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${isSaved ? 'bg-indigo-600 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          "Save List"
                        )}
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        {topSongs.map((song, index) => (
                          <motion.div 
                            key={index}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="group bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/20 transition-all"
                          >
                            <div className="w-10 h-10 flex items-center justify-center text-2xl font-black text-white/20 group-hover:text-white/40 transition-colors">
                              0{index + 1}
                            </div>
                            
                            {/* Album Art in List */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                              {song.album_art_url ? (
                                <img 
                                  src={song.album_art_url} 
                                  alt="cover" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(song.song_title)}/200`;
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                  <Music className="w-5 h-5 text-zinc-600" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                              <input 
                                type="text"
                                placeholder="Song Title"
                                value={song.song_title || ""}
                                onChange={(e) => updateSong(index, "song_title", e.target.value)}
                                className="bg-transparent border-none focus:ring-0 p-0 text-lg font-medium placeholder:text-zinc-700 truncate w-full"
                              />
                              <input 
                                type="text"
                                placeholder="Artist"
                                value={song.artist_name || ""}
                                onChange={(e) => updateSong(index, "artist_name", e.target.value)}
                                className="bg-transparent border-none focus:ring-0 p-0 text-zinc-400 placeholder:text-zinc-700 truncate w-full"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {song.preview_url && (
                                <button 
                                  onClick={() => togglePlay(song.preview_url!)}
                                  className={`p-2 rounded-lg transition-all ${playingUrl === song.preview_url ? 'bg-[#1DB954] text-black' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
                                >
                                  {playingUrl === song.preview_url ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                  )}
                                </button>
                              )}
                              {song.spotify_url && (
                                <a 
                                  href={song.spotify_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-zinc-400"
                                  title="Open in Spotify"
                                >
                                  <Music className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </section>

                {/* Share Vibe Button (Legacy) */}
                {topSongs.length >= 3 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setShowStoryModal(true)}
                    className="w-full mt-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-purple-500/20"
                  >
                    <Instagram className="w-6 h-6" />
                    Share Your Vibe Summary
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="friends"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">Friends</h1>
                  <p className="text-zinc-500">Compare your musical chemistry with your circle.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <div className="relative w-full sm:w-80">
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-[#1DB954] transition-all"
                      />
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-4 top-3.5 text-zinc-500" />
                      ) : (
                        <Users className="w-4 h-4 absolute right-4 top-3.5 text-zinc-500" />
                      )}
                    </div>

                    <AnimatePresence>
                      {searchQuery.length >= 2 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          {searchResults.length > 0 ? (
                            searchResults.map(u => {
                              const isAlreadyFriend = friends.some(f => f.id === u.id);
                              return (
                                <button 
                                  key={u.id}
                                  onClick={() => {
                                    if (isAlreadyFriend) {
                                      // Scroll to friend
                                      const element = document.getElementById(`friend-card-${u.id}`);
                                      if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        element.classList.add('ring-2', 'ring-[#1DB954]', 'ring-offset-4', 'ring-offset-black');
                                        setTimeout(() => {
                                          element.classList.remove('ring-2', 'ring-[#1DB954]', 'ring-offset-4', 'ring-offset-black');
                                        }, 3000);
                                      }
                                    } else {
                                      connectWithFriend(u.id);
                                    }
                                    setSearchQuery("");
                                    setSearchResults([]);
                                  }}
                                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-none"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10">
                                      {u.image_url ? (
                                        <img 
                                          src={u.image_url} 
                                          alt="" 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer" 
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.display_name)}&backgroundColor=b6e3f4`;
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{u.display_name.charAt(0)}</div>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold">{u.display_name}</span>
                                      <span className="text-[10px] text-zinc-500">{u.email}</span>
                                    </div>
                                  </div>
                                  {isAlreadyFriend ? (
                                    <Check className="w-4 h-4 text-[#1DB954]" />
                                  ) : (
                                    <Plus className="w-4 h-4 text-[#1DB954]" />
                                  )}
                                </button>
                              );
                            })
                          ) : !isSearching ? (
                            <div className="p-4 text-center text-xs text-zinc-500 italic">No users found</div>
                          ) : null}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-[#1DB954] text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-[#1ed760] transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {friendsActivity.length > 0 ? (
                    friendsActivity.map((friend) => {
                      const friendSongs = friend.songs.filter((s: any) => s.type === "weekly");
                      const topChoice = friendSongs[0];
                      const compatibility = calculateCompatibility(topSongs, friendSongs);
                      const recommendation = getRecommendation(topSongs, friendSongs);

                      return (
                        <motion.div 
                          key={friend.id}
                          id={`friend-card-${friend.id}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => {
                            setSelectedFriend(friend);
                            setShowFriendModal(true);
                          }}
                          className="bg-white/5 border border-white/5 rounded-[32px] p-6 space-y-4 hover:border-white/10 transition-all group cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-4">
                            <div className="bg-[#1DB954]/10 text-[#1DB954] px-3 py-1 rounded-full text-[10px] font-black italic">
                              {compatibility}% Match
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-sm font-bold overflow-hidden border border-white/10 shadow-lg">
                                {friend.image_url ? (
                                  <img 
                                    src={friend.image_url} 
                                    alt={friend.display_name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(friend.display_name)}&backgroundColor=b6e3f4`;
                                    }}
                                  />
                                ) : (
                                  friend.display_name.charAt(0)
                                )}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{friend.display_name}</h3>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Now</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {topChoice && (
                              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Top Choice</p>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {topChoice.album_art_url ? (
                                      <img 
                                        src={topChoice.album_art_url} 
                                        alt="" 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer" 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(topChoice.song_title)}/200`;
                                        }}
                                      />
                                    ) : (
                                      <Music className="w-4 h-4 text-zinc-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold truncate">{topChoice.song_title}</p>
                                    <p className="text-[8px] text-zinc-500 truncate">{topChoice.artist_name}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {recommendation && (
                              <div className="bg-[#1DB954]/5 rounded-2xl p-3 border border-[#1DB954]/10">
                                <p className="text-[9px] font-bold text-[#1DB954] uppercase tracking-widest mb-2">Recommended</p>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {recommendation.album_art_url ? (
                                      <img 
                                        src={recommendation.album_art_url} 
                                        alt="" 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer" 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(recommendation.song_title)}/200`;
                                        }}
                                      />
                                    ) : (
                                      <Music className="w-4 h-4 text-zinc-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold truncate">{recommendation.song_title}</p>
                                    <p className="text-[8px] text-zinc-500 truncate">{recommendation.artist_name}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-20 text-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-zinc-700" />
                      </div>
                      <h3 className="text-xl font-bold">No activity yet</h3>
                      <p className="text-zinc-500 max-w-xs mx-auto">Invite friends to see their Top 5 tracks and compare your musical chemistry.</p>
                      <button 
                        onClick={() => setShowInviteModal(true)}
                        className="text-sm font-bold text-[#1DB954] hover:underline"
                      >
                        Invite Friends
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Friend Detail Modal */}
      <AnimatePresence>
        {showFriendModal && selectedFriend && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFriendModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[40px] p-8 space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <button 
                onClick={() => setShowFriendModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-[32px] border-4 border-[#1DB954] overflow-hidden bg-zinc-800 flex items-center justify-center shadow-2xl">
                  {selectedFriend.image_url ? (
                    <img 
                      src={selectedFriend.image_url} 
                      alt={selectedFriend.display_name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-zinc-500">{selectedFriend.display_name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{selectedFriend.display_name}</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Friend Profile</p>
                </div>
                <button 
                  onClick={() => fetchFriendsActivity()}
                  disabled={isRefreshingActivity}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-zinc-400 flex items-center gap-2 px-4 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingActivity ? "animate-spin" : ""}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {isRefreshingActivity ? "Refreshing..." : "Refresh"}
                  </span>
                </button>
              </div>

                <div className="flex justify-center">
                  <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
                    <button 
                      onClick={() => setFriendModalTab("weekly")}
                      className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${friendModalTab === "weekly" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
                    >
                      Weekly
                    </button>
                    <button 
                      onClick={() => setFriendModalTab("all-time")}
                      className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${friendModalTab === "all-time" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
                    >
                      All-time
                    </button>
                  </div>
                </div>

              <div className="space-y-3">
                {selectedFriend.songs
                  .filter((s: any) => s.type === friendModalTab)
                  .sort((a: any, b: any) => a.rank - b.rank)
                  .map((song: any) => (
                    <div key={song.rank} className="bg-white/5 rounded-2xl p-3 flex items-center gap-4 border border-white/5 group">
                      <span className="text-xl font-black text-white/10 w-6">0{song.rank}</span>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                        {song.album_art_url ? (
                          <img 
                            src={song.album_art_url} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(song.song_title)}/200`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-zinc-600" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:text-[#1DB954] transition-colors">{song.song_title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{song.artist_name}</p>
                      </div>
                      {song.preview_url && (
                        <button 
                          onClick={() => togglePlay(song.preview_url)}
                          className={`p-2 rounded-lg transition-all ${playingUrl === song.preview_url ? 'bg-[#1DB954] text-black' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
                        >
                          {playingUrl === song.preview_url ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Accuracy</p>
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
                      <circle 
                         cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="8" 
                         className="text-[#1DB954]"
                         strokeDasharray={226}
                          strokeDashoffset={226 - (226 * calculateCompatibility(topSongs, selectedFriend.songs.filter((s: any) => s.type === friendModalTab))) / 100}
                         strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-black italic">
                      {calculateCompatibility(topSongs, selectedFriend.songs.filter((s: any) => s.type === friendModalTab))}%
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 flex flex-col justify-center space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shared Recommendation</p>
                  {(() => {
                    const friendSongs = selectedFriend.songs.filter((s: any) => s.type === friendModalTab);
                    const rec = getRecommendation(topSongs, friendSongs);
                    if (!rec) return <p className="text-xs text-zinc-600 italic">No songs yet</p>;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                          {rec.album_art_url ? (
                            <img 
                              src={rec.album_art_url} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(rec.song_title)}/200`;
                              }}
                            />
                          ) : (
                            <Music className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{rec.song_title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{rec.artist_name}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1DB954]/20 to-zinc-900/50 rounded-[32px] p-6 border border-[#1DB954]/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1DB954]" />
                    <h3 className="text-sm font-black italic uppercase tracking-wider">AI Vibe Comparison</h3>
                  </div>
                  <button 
                    onClick={() => compareWithFriend(selectedFriend)}
                    disabled={isComparing}
                    className="text-[10px] font-bold text-[#1DB954] hover:underline disabled:opacity-50"
                  >
                    {isComparing ? "Analyzing..." : "Run Analysis"}
                  </button>
                </div>

                {comparisonResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-black italic text-[#1DB954]">{comparisonResult.score}/10</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{comparisonResult.explanation}</p>
                    </div>
                    {comparisonResult.recommendation && (
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">AI Shared Recommendation</p>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#1DB954]/20 flex items-center justify-center">
                            <Music className="w-4 h-4 text-[#1DB954]" />
                          </div>
                          <p className="text-xs font-bold">{comparisonResult.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Click 'Run Analysis' to see how your vibes match up!</p>
                )}
              </div>

              <button 
                onClick={() => setShowFriendModal(false)}
                className="w-full bg-white text-black font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Close Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Details Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] p-8 space-y-8 shadow-2xl text-center"
            >
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>

              <AnimatePresence mode="wait">
                {!showAvatarPicker ? (
                  <motion.div 
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAvatarPicker(true)}
                      className="relative group mx-auto block"
                    >
                      <div className="w-24 h-24 rounded-full border-4 border-[#1DB954] overflow-hidden bg-zinc-800 flex items-center justify-center shadow-[0_0_30px_rgba(29,185,84,0.2)] transition-all group-hover:shadow-[0_0_40px_rgba(29,185,84,0.4)]">
                        {user.image_url ? (
                          <img 
                            src={user.image_url} 
                            alt={user.display_name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-3xl font-bold text-zinc-500">{user.display_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Change</span>
                      </div>
                    </motion.button>
                    
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">{user.display_name}</h2>
                      <p className="text-zinc-400 text-sm">{user.email}</p>
                      <div className="pt-4 flex items-center justify-center gap-2 text-[#1DB954] text-xs font-bold uppercase tracking-widest">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" 
                          alt="Spotify" 
                          className="w-4 h-4"
                          referrerPolicy="no-referrer"
                        />
                        Spotify Connected
                      </div>
                    </div>

                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowProfileModal(false)}
                      className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-all"
                    >
                      Close
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="picker"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="text-left space-y-1">
                      <h3 className="text-xl font-bold">Pick an Avatar</h3>
                      <p className="text-zinc-500 text-xs">Choose a fun character for your profile.</p>
                    </div>

                    <div className="relative group/scroll">
                      <div 
                        ref={scrollContainerRef}
                        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 snap-x scroll-smooth"
                      >
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={syncProfileFromSpotify}
                          disabled={isSyncingProfile}
                          className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center group snap-center ${user.image_url === user.spotify_image_url ? 'border-[#1DB954] bg-[#1DB954]/10' : 'border-white/5 bg-white/5 hover:border-[#1DB954]'}`}
                        >
                          {user.spotify_image_url ? (
                            <img 
                              src={user.spotify_image_url} 
                              alt="Spotify" 
                              className={`w-full h-full object-cover ${isSyncingProfile ? 'animate-pulse' : ''}`}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <RefreshCw className={`w-6 h-6 text-zinc-500 group-hover:text-[#1DB954] ${isSyncingProfile ? 'animate-spin text-[#1DB954]' : ''}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-[#1DB954]">Sync</span>
                            </div>
                          )}
                        </motion.button>
                        {avatars.map((avatar, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateProfileImage(avatar)}
                            className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all snap-center ${user.image_url === avatar ? 'border-[#1DB954] bg-[#1DB954]/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                          >
                            <img src={avatar} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                          </motion.button>
                        ))}
                      </div>

                      {/* Scroll Buttons */}
                      <button 
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity z-10 hover:bg-black/80"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity z-10 hover:bg-black/80"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-4 space-y-3">
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAvatarPicker(false)}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                      >
                        Back
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instagram Story Bottom Sheet */}
      <AnimatePresence>
        {showStoryModal && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStoryModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-zinc-900 rounded-t-[3rem] p-6 sm:p-8 space-y-6 shadow-2xl border-t border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight">Share Your Vibe</h3>
                <button 
                  onClick={() => setShowStoryModal(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Poster Preview */}
              <div className="flex justify-center">
                <div 
                  id="instagram-story-content"
                  className="w-[280px] h-[497px] sm:w-[320px] sm:h-[568px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden rounded-3xl shadow-2xl flex flex-col p-6 text-white font-sans"
                >
                  {/* Background Accents */}
                  <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-black/20 rounded-full blur-3xl" />
                  
                  {/* Header */}
                  <div className="relative z-10 space-y-0.5">
                    <h2 className="text-4xl font-black tracking-tighter leading-none italic break-words">
                      Your Top5 {activeTab === 'weekly' ? 'This Week' : 'All Time'}
                    </h2>
                  </div>

                  {/* Main Content */}
                  <div className="relative z-10 mt-3 flex-1 flex flex-col gap-2 min-w-0">
                    {/* Top 1 Highlight */}
                    {topSongs[0] && (
                      <div className="relative bg-black/20 backdrop-blur-md rounded-2xl p-3 flex gap-3 items-center border border-white/10 min-w-0">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                          <img 
                            src={topSongs[0].album_art_url || `https://picsum.photos/seed/${topSongs[0].song_title}/200/200`} 
                            alt="cover" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-3xl font-black text-white/10 absolute top-1 right-3">1</span>
                          <p className="font-bold text-lg truncate leading-tight pr-6">{topSongs[0].song_title}</p>
                          <p className="text-xs font-bold opacity-80 truncate">{topSongs[0].artist_name}</p>
                        </div>
                      </div>
                    )}

                    {/* List 2-5 */}
                    <div className="space-y-1.5 min-w-0">
                      {topSongs.slice(1, 5).map((song, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex gap-3 items-center border border-white/5 min-w-0 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
                            <img 
                              src={song.album_art_url || `https://picsum.photos/seed/${song.song_title}/100/100`} 
                              alt="cover" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate pr-4">{song.song_title}</p>
                            <p className="text-[10px] font-bold opacity-70 truncate">{song.artist_name}</p>
                          </div>
                          <span className="text-xl font-black opacity-20 italic flex-shrink-0">{i + 2}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Branding */}
                  <div className="relative z-10 mt-auto flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-baseline">
                        <span className="text-xl font-black tracking-tighter text-white">Top</span>
                        <span className="text-xl font-black tracking-tighter text-[#1DB954]">5</span>
                        <Sparkles className="w-2.5 h-2.5 text-[#1DB954] absolute -top-1 -right-3" />
                      </div>
                    </div>
                    <p className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1">Made with Top5</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button 
                  onClick={async () => {
                    const element = document.getElementById('instagram-story-content');
                    if (!element) return;
                    setIsGeneratingImage(true);
                    try {
                      const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2 });
                      const blob = await (await fetch(dataUrl)).blob();
                      const file = new File([blob], 'top5-story.png', { type: 'image/png' });
                      
                      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: 'My Top5',
                        });
                      } else {
                        const link = document.createElement('a');
                        link.download = `Top5-Story.png`;
                        link.href = dataUrl;
                        link.click();
                        window.open('https://www.instagram.com/', '_blank');
                      }
                    } catch (err) {
                      console.error('Sharing failed', err);
                    } finally {
                      setIsGeneratingImage(false);
                    }
                  }}
                  disabled={isGeneratingImage}
                  className="w-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-purple-500/20"
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Instagram className="w-6 h-6" />
                  )}
                  Share to Instagram Story
                </button>
                
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => {
                      const text = `Join me on Top5! Curate your musical identity and see how our tastes compare. Check it out here: ${user?.app_url || window.location.origin}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="bg-[#25D366]/10 text-[#25D366] font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:bg-[#25D366]/20"
                  >
                    <Share className="w-5 h-5" />
                    <span className="text-[10px]">WhatsApp</span>
                  </button>
                  <button 
                    onClick={async () => {
                      const url = user?.app_url || window.location.origin;
                      await navigator.clipboard.writeText(url);
                      alert('Link copied!');
                    }}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                    <span className="text-[10px]">Copy Link</span>
                  </button>
                  <button 
                    onClick={downloadStory}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-[10px]">Download</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] p-8 space-y-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <LogOut className="w-10 h-10 text-red-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Exit App?</h2>
                <p className="text-zinc-400 text-sm">Are you sure you want to log out? You'll need to connect Spotify again to see your Top 5.</p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      // Aggressive logout and simple redirect
                      await fetch("/api/auth/logout", { method: "POST" });
                    } catch (e) {}
                    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = "/";
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Yes, Exit
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowExitModal(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>

              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-[#1DB954]/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-[#1DB954]" />
                </div>
                <h2 className="text-2xl font-bold">Invite Friends</h2>
                <p className="text-zinc-500 text-sm">Share your profile link with friends to compare your musical taste.</p>
              </div>

                <div className="space-y-4">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <p className="text-xs font-mono text-zinc-400 truncate flex-1">
                    {`${window.location.origin}/?invite=${user?.id}`}
                  </p>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      const url = `${window.location.origin}/?invite=${user?.id}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      } catch (err) {
                        // Fallback for non-secure contexts or if clipboard API fails
                        const textArea = document.createElement("textarea");
                        textArea.value = url;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        } catch (e) {
                          console.error('Fallback copy failed', e);
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isCopied ? 'bg-indigo-600 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      "Copy"
                    )}
                  </motion.button>
                </div>
                
                <button 
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?invite=${user?.id}`;
                    const text = `Join me on Top5! Curate your musical identity and see how our tastes compare. Check it out here: ${shareUrl}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                >
                  WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-white/5 px-6 py-3 flex justify-around items-center z-50">
        <button 
          onClick={() => setView("home")}
          className={`flex flex-col items-center gap-1 transition-colors ${view === "home" ? "text-white" : "text-zinc-500"}`}
        >
          <Music className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">My Top5</span>
        </button>
        <button 
          onClick={() => setView("friends")}
          className={`flex flex-col items-center gap-1 transition-colors ${view === "friends" ? "text-white" : "text-zinc-500"}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Friends</span>
        </button>
      </nav>
    </div>
  );
}
