import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Music, Sparkles, Play, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { VibeRecommendation, TopSong, VibeMode } from "../types/vibe";
import { generateVibeRecommendation } from "../services/vibeService";

interface VibeCheckProps {
  songs: TopSong[];
  mode: VibeMode;
}

export const VibeCheck: React.FC<VibeCheckProps> = ({ songs, mode }) => {
  const [recommendation, setRecommendation] = useState<VibeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const fetchRecommendation = useCallback(async () => {
    if (songs.length < 3) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await generateVibeRecommendation(songs, mode, history);
      setRecommendation(result);
      setHistory(prev => [...prev.slice(-9), result.recommended_song_title]);
    } catch (err: any) {
      console.error("Vibe Check Error:", err);
      setError(err.message || "Failed to generate recommendation. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [songs, mode, history]);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      fetchRecommendation();
    }
  };

  // Initial fetch when songs change or mode changes
  useEffect(() => {
    if (songs.length >= 3 && !recommendation) {
      fetchRecommendation();
    }
  }, [songs, mode, fetchRecommendation, recommendation]);

  // Reset recommendation when songs or mode change significantly
  useEffect(() => {
    setRecommendation(null);
  }, [mode]);

  if (songs.length < 3) {
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 text-center">
        <Music className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500 text-sm">Add at least 3 songs to unlock your AI Vibe Check.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Vibe Check</h3>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Based on your {mode} taste
            </p>
          </div>
        </div>
        
        <button 
          onClick={fetchRecommendation}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50 group"
          title="Find Another"
        >
          <RefreshCw className={`w-5 h-5 text-zinc-400 group-hover:text-white transition-all ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-zinc-400 text-sm animate-pulse">Analyzing your musical DNA...</p>
          </motion.div>
        ) : error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center"
          >
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <div className="flex flex-col gap-3 items-center">
              <button 
                onClick={fetchRecommendation}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-all"
              >
                Try Again
              </button>
              {error.toLowerCase().includes("api key") && (
                <button 
                  onClick={handleSelectKey}
                  className="text-[10px] text-zinc-500 hover:text-zinc-400 underline"
                >
                  Select API Key
                </button>
              )}
            </div>
          </motion.div>
        ) : recommendation ? (
          <motion.div 
            key="recommendation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="p-6 flex flex-col md:flex-row gap-6">
              <div className="relative group shrink-0">
                <img 
                  src={recommendation.album_cover_image_url} 
                  alt={recommendation.recommended_song_title}
                  className="w-full md:w-40 aspect-square object-cover rounded-xl shadow-2xl transition-transform group-hover:scale-105 duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(recommendation.recommended_song_title)}/400`;
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <Play className="w-10 h-10 text-white fill-current" />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="text-2xl font-black text-white leading-tight mb-1">
                    {recommendation.recommended_song_title}
                  </h4>
                  <p className="text-indigo-400 font-medium">{recommendation.recommended_artist}</p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-zinc-300 text-sm leading-relaxed italic">
                    "{recommendation.short_vibe_explanation}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <a 
                    href={recommendation.spotify_track_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play on Spotify
                  </a>
                  
                  <button 
                    onClick={fetchRecommendation}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition-all active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Find Another
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
