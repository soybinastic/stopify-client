import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { EditorService } from '../core/editor.service';
import { artistNames, formatDuration } from '../core/format';
import { errorMessage } from '../core/format';
import { AlbumSummary, ArtistSummary, Track } from '../core/models';
import { PlayerService } from '../core/player.service';
import { CoverComponent } from '../shared/cover.component';

@Component({
  selector: 'app-library',
  imports: [RouterLink, CoverComponent],
  templateUrl: './library.component.html'
})
export class LibraryComponent {
  private readonly api = inject(ApiService);
  readonly editor = inject(EditorService);
  readonly player = inject(PlayerService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly artists = signal<ArtistSummary[]>([]);
  readonly albums = signal<AlbumSummary[]>([]);
  readonly tracks = signal<Track[]>([]);
  readonly formatDuration = formatDuration;
  readonly artistNames = artistNames;

  readonly filteredArtists = computed(() => this.filter(this.artists(), (artist) =>
    `${artist.name} ${artist.biography ?? ''}`));

  readonly filteredAlbums = computed(() => this.filter(this.albums(), (album) =>
    `${album.title} ${album.artistName}`));

  readonly filteredTracks = computed(() => this.filter(this.tracks(), (track) =>
    `${track.title} ${artistNames(track.artists)} ${track.albumTitle}`));

  constructor() {
    effect(() => {
      this.editor.saved();
      untracked(() => void this.load());
    });
  }

  onQuery(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.query.set(event.target.value);
  }

  play(track: Track): void {
    this.player.playTrack(track, this.filteredTracks());
  }

  private filter<T>(items: T[], text: (item: T) => string): T[] {
    const query = this.query().trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => text(item).toLowerCase().includes(query));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(forkJoin({
        artists: this.api.getArtists(),
        albums: this.api.getAlbums(),
        tracks: this.api.getTracks()
      }));
      this.artists.set(result.artists);
      this.albums.set(result.albums);
      this.tracks.set(result.tracks);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
