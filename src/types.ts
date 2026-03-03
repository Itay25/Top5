export interface Song {
  id?: number;
  song_title: string;
  artist_name: string;
  rank: number;
  type?: string;
  spotify_url?: string;
  preview_url?: string;
  album_art_url?: string;
}

export interface User {
  id: string;
  display_name: string;
  email: string;
  spotify_id?: string;
  app_url?: string;
  image_url?: string;
  spotify_image_url?: string;
}

export interface AIComparison {
  score: number;
  explanation: string;
  recommendation?: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
