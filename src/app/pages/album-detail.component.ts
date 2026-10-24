import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { EditorService } from '../core/editor.service';
import { artistNames, errorMessage, formatDuration } from '../core/format';
import { AlbumDetail, Track } from '../core/models';
import { PlayerService } from '../core/player.service';
import { CoverComponent } from '../shared/cover.component';

@Component({
  selector: 'app-album-detail',
  imports: [RouterLink, CoverComponent],
  templateUrl: './album-detail.component.html'
})
export class AlbumDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly editor = inject(EditorService);
  readonly player = inject(PlayerService);

  private readonly albumId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') }
  );
  private requestSeq = 0;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly album = signal<AlbumDetail | null>(null);
  readonly confirming = signal(false);
  readonly pendingTrackId = signal<string | null>(null);
  readonly formatDuration = formatDuration;
  readonly artistNames = artistNames;

  constructor() {
    effect(() => {
      const id = this.albumId();
      this.editor.saved();
      if (!id) return;
      untracked(() => void this.load(id));
    });
  }

  play(track?: Track): void {
    const album = this.album();
    if (!album?.tracks.length) return;
    this.player.playTrack(track ?? album.tracks[0], album.tracks);
  }

  edit(): void {
    const album = this.album();
    if (!album) return;
    this.editor.open({
      kind: 'album',
      mode: 'edit',
      id: album.id,
      artistId: album.artistId,
      title: album.title,
      releaseYear: album.releaseYear,
      coverUrl: album.coverUrl
    });
  }

  createTrack(): void {
    const album = this.album();
    if (!album) return;
    this.editor.open({
      kind: 'track',
      mode: 'create',
      albumId: album.id,
      artistIds: [album.artistId],
      suggestedTrackNumber: album.tracks.length + 1
    });
  }

  editTrack(track: Track): void {
    this.editor.open({
      kind: 'track',
      mode: 'edit',
      id: track.id,
      albumId: track.albumId,
      artistIds: track.artists.map((artist) => artist.id),
      title: track.title,
      trackNumber: track.trackNumber,
      durationSeconds: track.durationSeconds,
      audioUrl: track.audioUrl
    });
  }

  async remove(): Promise<void> {
    const album = this.album();
    if (!album) return;
    if (!this.confirming()) {
      this.confirming.set(true);
      return;
    }

    try {
      await firstValueFrom(this.api.deleteAlbum(album.id));
      this.player.forget((track) => track.albumId === album.id);
      await this.router.navigate(['/artists', album.artistId]);
    } catch (error) {
      this.error.set(errorMessage(error));
      this.confirming.set(false);
    }
  }

  async removeTrack(track: Track): Promise<void> {
    if (this.pendingTrackId() !== track.id) {
      this.pendingTrackId.set(track.id);
      return;
    }

    const album = this.album();
    if (!album) return;

    try {
      await firstValueFrom(this.api.deleteTrack(track.id));
      this.player.forget((item) => item.id === track.id);
      this.pendingTrackId.set(null);
      await this.load(album.id);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async load(id: string): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set(null);
    this.confirming.set(false);
    this.pendingTrackId.set(null);
    if (this.album()?.id !== id) this.album.set(null);
    try {
      const album = await firstValueFrom(this.api.getAlbum(id));
      if (seq !== this.requestSeq) return;
      this.album.set(album);
    } catch (error) {
      if (seq !== this.requestSeq) return;
      this.album.set(null);
      this.error.set(errorMessage(error));
    } finally {
      if (seq === this.requestSeq) this.loading.set(false);
    }
  }
}
