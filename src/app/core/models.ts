export interface ArtistSummary {
  id: string;
  name: string;
  biography: string | null;
  imageUrl: string | null;
  albumCount: number;
}

export interface AlbumSummary {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string | null;
  trackCount: number;
}

export interface TrackArtist {
  id: string;
  name: string;
}

export interface Track {
  id: string;
  title: string;
  albumId: string;
  albumTitle: string;
  artists: TrackArtist[];
  trackNumber: number;
  durationSeconds: number;
  audioUrl: string | null;
  coverUrl: string | null;
}

export interface ArtistDetail {
  id: string;
  name: string;
  biography: string | null;
  imageUrl: string | null;
  albums: AlbumSummary[];
  tracks: Track[];
}

export interface AlbumDetail {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string | null;
  tracks: Track[];
}

export interface UpsertArtist {
  name: string;
  biography: string | null;
  imageUrl: string | null;
}

export interface UpsertAlbum {
  title: string;
  artistId: string;
  releaseYear: number | null;
  coverUrl: string | null;
}

export interface UpsertTrack {
  title: string;
  albumId: string;
  trackNumber: number;
  durationSeconds: number;
  audioUrl: string | null;
  artistIds: string[];
}
