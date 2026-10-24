import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { EditorService } from '../core/editor.service';
import { errorMessage } from '../core/format';
import { AlbumSummary } from '../core/models';
import { PlayerService } from '../core/player.service';
import { CoverComponent } from '../shared/cover.component';

@Component({
  selector: 'app-albums',
  imports: [RouterLink, CoverComponent],
  templateUrl: './albums.component.html'
})
export class AlbumsComponent {
  private readonly api = inject(ApiService);
  readonly editor = inject(EditorService);
  readonly player = inject(PlayerService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly albums = signal<AlbumSummary[]>([]);

  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.albums();
    return this.albums().filter((album) =>
      `${album.title} ${album.artistName}`.toLowerCase().includes(query));
  });

  constructor() {
    effect(() => {
      this.editor.saved();
      untracked(() => void this.load());
    });
  }

  onQuery(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.query.set(event.target.value);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.albums.set(await firstValueFrom(this.api.getAlbums()));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
