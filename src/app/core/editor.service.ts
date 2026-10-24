import { Injectable, signal } from '@angular/core';

export type EditorKind = 'artist' | 'album' | 'track';

export interface EditorRequest {
  kind: EditorKind;
  mode: 'create' | 'edit';
  id?: string;
  artistId?: string;
  albumId?: string;
  suggestedTrackNumber?: number;
  name?: string;
  biography?: string | null;
  imageUrl?: string | null;
  title?: string;
  releaseYear?: number | null;
  coverUrl?: string | null;
  trackNumber?: number;
  durationSeconds?: number;
  audioUrl?: string | null;
  artistIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class EditorService {
  readonly request = signal<EditorRequest | null>(null);
  readonly saved = signal(0);

  open(request: EditorRequest): void {
    this.request.set(request);
  }

  close(): void {
    this.request.set(null);
  }

  markSaved(): void {
    this.saved.update((value) => value + 1);
    this.close();
  }
}
