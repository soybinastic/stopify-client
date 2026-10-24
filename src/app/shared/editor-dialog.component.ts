import { Component, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { EditorRequest, EditorService } from '../core/editor.service';
import { emptyToNull, errorMessage, formatClock, parseDuration } from '../core/format';
import { AlbumSummary, ArtistSummary } from '../core/models';
import { ArtistMultiSelectComponent } from './artist-multi-select.component';

@Component({
  selector: 'app-editor-dialog',
  imports: [ReactiveFormsModule, ArtistMultiSelectComponent],
  templateUrl: './editor-dialog.component.html'
})
export class EditorDialogComponent {
  readonly editor = inject(EditorService);
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(FormBuilder);
  private prepareSeq = 0;

  readonly artists = signal<ArtistSummary[]>([]);
  readonly albums = signal<AlbumSummary[]>([]);
  readonly formError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly saving = signal(false);

  readonly artistForm = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    biography: this.formBuilder.nonNullable.control('', Validators.maxLength(2000)),
    imageUrl: this.formBuilder.nonNullable.control('', Validators.maxLength(1000))
  });

  readonly albumForm = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    artistId: this.formBuilder.nonNullable.control('', Validators.required),
    releaseYear: this.formBuilder.control<number | null>(null),
    coverUrl: this.formBuilder.nonNullable.control('', Validators.maxLength(1000))
  });

  readonly trackForm = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    albumId: this.formBuilder.nonNullable.control('', Validators.required),
    artistIds: this.formBuilder.nonNullable.control<string[]>([], Validators.required),
    trackNumber: this.formBuilder.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(500)]),
    duration: this.formBuilder.nonNullable.control('0:00', Validators.required),
    audioUrl: this.formBuilder.nonNullable.control('', Validators.maxLength(1000))
  });

  constructor() {
    effect(() => {
      const request = this.editor.request();
      if (!request) return;
      untracked(() => void this.prepare(request));
    });
  }

  heading(request: EditorRequest): string {
    const verb = request.mode === 'create' ? 'New' : 'Edit';
    return `${verb} ${request.kind}`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    if (!this.saving()) this.editor.close();
  }

  async save(event?: Event): Promise<void> {
    event?.preventDefault();
    const request = this.editor.request();
    if (!request || this.saving()) return;

    this.submitted.set(true);
    this.formError.set(null);
    this.saving.set(true);

    try {
      if (request.kind === 'artist') {
        if (this.artistForm.invalid) return;
        const body = {
          name: this.artistForm.controls.name.value.trim(),
          biography: emptyToNull(this.artistForm.controls.biography.value),
          imageUrl: emptyToNull(this.artistForm.controls.imageUrl.value)
        };
        if (!body.name) {
          this.formError.set('Name is required.');
          return;
        }
        if (request.mode === 'create') await firstValueFrom(this.api.createArtist(body));
        else await firstValueFrom(this.api.updateArtist(request.id ?? '', body));
      }

      if (request.kind === 'album') {
        if (this.albumForm.invalid) return;
        const rawYear = this.albumForm.controls.releaseYear.value;
        const body = {
          title: this.albumForm.controls.title.value.trim(),
          artistId: this.albumForm.controls.artistId.value,
          releaseYear: rawYear === null || Number.isNaN(Number(rawYear)) ? null : Number(rawYear),
          coverUrl: emptyToNull(this.albumForm.controls.coverUrl.value)
        };
        if (!body.title) {
          this.formError.set('Title is required.');
          return;
        }
        if (request.mode === 'create') await firstValueFrom(this.api.createAlbum(body));
        else await firstValueFrom(this.api.updateAlbum(request.id ?? '', body));
      }

      if (request.kind === 'track') {
        if (this.trackForm.invalid) return;
        const durationSeconds = parseDuration(this.trackForm.controls.duration.value);
        if (durationSeconds === null || durationSeconds > 14400) {
          this.formError.set('Use a duration like 3:45, up to 4 hours.');
          return;
        }
        const body = {
          title: this.trackForm.controls.title.value.trim(),
          albumId: this.trackForm.controls.albumId.value,
          trackNumber: Number(this.trackForm.controls.trackNumber.value),
          durationSeconds,
          audioUrl: emptyToNull(this.trackForm.controls.audioUrl.value),
          artistIds: this.trackForm.controls.artistIds.value
        };
        if (!body.title) {
          this.formError.set('Title is required.');
          return;
        }
        if (request.mode === 'create') await firstValueFrom(this.api.createTrack(body));
        else await firstValueFrom(this.api.updateTrack(request.id ?? '', body));
      }

      this.editor.markSaved();
    } catch (error) {
      this.formError.set(errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async prepare(request: EditorRequest): Promise<void> {
    const seq = ++this.prepareSeq;
    this.formError.set(null);
    this.submitted.set(false);

    try {
      if (request.kind === 'album') {
        const artists = await firstValueFrom(this.api.getArtists());
        if (seq !== this.prepareSeq) return;
        this.artists.set(artists);
      }
      if (request.kind === 'track') {
        const [albums, artists] = await Promise.all([
          firstValueFrom(this.api.getAlbums()),
          firstValueFrom(this.api.getArtists())
        ]);
        if (seq !== this.prepareSeq) return;
        this.albums.set(albums);
        this.artists.set(artists);
      }
    } catch (error) {
      if (seq !== this.prepareSeq) return;
      this.formError.set(errorMessage(error));
    }

    if (seq !== this.prepareSeq) return;

    if (request.kind === 'artist') {
      this.artistForm.reset({
        name: request.name ?? '',
        biography: request.biography ?? '',
        imageUrl: request.imageUrl ?? ''
      });
    }

    if (request.kind === 'album') {
      this.albumForm.reset({
        title: request.title ?? '',
        artistId: request.artistId ?? '',
        releaseYear: request.releaseYear ?? null,
        coverUrl: request.coverUrl ?? ''
      });
    }

    if (request.kind === 'track') {
      const album = this.albums().find((item) => item.id === (request.albumId ?? ''));
      this.trackForm.reset({
        title: request.title ?? '',
        albumId: request.albumId ?? '',
        artistIds: request.artistIds?.length ? request.artistIds : album ? [album.artistId] : [],
        trackNumber: request.trackNumber ?? request.suggestedTrackNumber ?? 1,
        duration: formatClock(request.durationSeconds ?? 0),
        audioUrl: request.audioUrl ?? ''
      });
    }
  }

  onAlbumChange(): void {
    if (this.trackForm.controls.artistIds.value.length) return;
    const album = this.albums().find((item) => item.id === this.trackForm.controls.albumId.value);
    if (album) this.trackForm.controls.artistIds.setValue([album.artistId]);
  }
}
