import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { EditorService } from '../core/editor.service';
import { artistNames, errorMessage, formatDuration } from '../core/format';
import { ArtistDetail, Track } from '../core/models';
import { PlayerService } from '../core/player.service';
import { CoverComponent } from '../shared/cover.component';

@Component({
  selector: 'app-artist-detail',
  imports: [RouterLink, CoverComponent],
  templateUrl: './artist-detail.component.html'
})
export class ArtistDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly editor = inject(EditorService);
  readonly player = inject(PlayerService);

  private readonly artistId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') }
  );
  private requestSeq = 0;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly artist = signal<ArtistDetail | null>(null);
  readonly confirming = signal(false);
  readonly formatDuration = formatDuration;
  readonly artistNames = artistNames;

  constructor() {
    effect(() => {
      const id = this.artistId();
      this.editor.saved();
      if (!id) return;
      untracked(() => void this.load(id));
    });
  }

  edit(): void {
    const artist = this.artist();
    if (!artist) return;
    this.editor.open({
      kind: 'artist',
      mode: 'edit',
      id: artist.id,
      name: artist.name,
      biography: artist.biography,
      imageUrl: artist.imageUrl
    });
  }

  createAlbum(): void {
    const artist = this.artist();
    if (!artist) return;
    this.editor.open({ kind: 'album', mode: 'create', artistId: artist.id });
  }

  async remove(): Promise<void> {
    const artist = this.artist();
    if (!artist) return;
    if (!this.confirming()) {
      this.confirming.set(true);
      return;
    }

    try {
      await firstValueFrom(this.api.deleteArtist(artist.id));
      this.player.releaseArtist(artist.id, new Set(artist.albums.map((album) => album.id)));
      await this.router.navigate(['/artists']);
    } catch (error) {
      this.error.set(errorMessage(error));
      this.confirming.set(false);
    }
  }

  play(track: Track): void {
    const artist = this.artist();
    if (!artist?.tracks.length) return;
    this.player.playTrack(track, artist.tracks);
  }

  private async load(id: string): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading.set(true);
    this.error.set(null);
    this.confirming.set(false);
    if (this.artist()?.id !== id) this.artist.set(null);
    try {
      const artist = await firstValueFrom(this.api.getArtist(id));
      if (seq !== this.requestSeq) return;
      this.artist.set(artist);
    } catch (error) {
      if (seq !== this.requestSeq) return;
      this.artist.set(null);
      this.error.set(errorMessage(error));
    } finally {
      if (seq === this.requestSeq) this.loading.set(false);
    }
  }
}
