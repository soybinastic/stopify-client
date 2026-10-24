import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { EditorService } from '../core/editor.service';
import { errorMessage } from '../core/format';
import { ArtistSummary } from '../core/models';
import { CoverComponent } from '../shared/cover.component';

@Component({
  selector: 'app-artists',
  imports: [RouterLink, CoverComponent],
  templateUrl: './artists.component.html'
})
export class ArtistsComponent {
  private readonly api = inject(ApiService);
  readonly editor = inject(EditorService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly artists = signal<ArtistSummary[]>([]);

  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.artists();
    return this.artists().filter((artist) =>
      `${artist.name} ${artist.biography ?? ''}`.toLowerCase().includes(query));
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
      this.artists.set(await firstValueFrom(this.api.getArtists()));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
