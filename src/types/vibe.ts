export interface VibeRecommendation {
  recommended_song_title: string;
  recommended_artist: string;
  short_vibe_explanation: string;
  spotify_track_url: string;
  album_cover_image_url: string;
  preview_url?: string;
}

export interface TopSong {
  song_title: string;
  artist_name: string;
}

export type VibeMode = 'weekly' | 'all-time';
