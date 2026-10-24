import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { Track } from './models';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly api = inject(ApiService);
  private readonly zone = inject(NgZone);
  private readonly audio = new Audio();

  readonly queue = signal<Track[]>([]);
  readonly index = signal(-1);
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(0.9);
  readonly error = signal<string | null>(null);

  readonly current = computed(() => {
    const queue = this.queue();
    const index = this.index();
    return index >= 0 && index < queue.length ? queue[index] : null;
  });

  constructor() {
    this.audio.preload = 'metadata';
    this.audio.volume = this.volume();

    this.zone.runOutsideAngular(() => {
      this.audio.addEventListener('timeupdate', () => {
        this.zone.run(() => this.currentTime.set(this.audio.currentTime || 0));
      });
      this.audio.addEventListener('durationchange', () => {
        const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
        this.zone.run(() => this.duration.set(duration));
      });
      this.audio.addEventListener('play', () => this.zone.run(() => this.isPlaying.set(true)));
      this.audio.addEventListener('pause', () => this.zone.run(() => this.isPlaying.set(false)));
      this.audio.addEventListener('ended', () => this.zone.run(() => this.next(true)));
      this.audio.addEventListener('error', () => {
        this.zone.run(() => {
          const track = this.current();
          if (!track?.audioUrl || !this.audio.src.includes(track.audioUrl)) return;
          this.isPlaying.set(false);
          this.error.set('This audio file could not be played.');
        });
      });
    });
  }

  playTrack(track: Track, queue: Track[]): void {
    const playableQueue = queue.length ? queue : [track];
    const index = playableQueue.findIndex((item) => item.id === track.id);
    this.queue.set(playableQueue);
    this.index.set(index >= 0 ? index : 0);
    this.load(true);
  }

  async playAlbum(albumId: string): Promise<void> {
    try {
      const album = await firstValueFrom(this.api.getAlbum(albumId));
      if (!album.tracks.length) {
        this.error.set('This album has no tracks yet.');
        return;
      }
      this.playTrack(album.tracks[0], album.tracks);
    } catch {
      this.error.set('The album could not be loaded.');
    }
  }

  toggle(): void {
    if (!this.current()) return;
    if (this.isPlaying()) {
      this.audio.pause();
      return;
    }
    this.playCurrent();
  }

  next(fromEnded = false): void {
    const nextIndex = this.index() + 1;
    if (nextIndex >= this.queue().length) {
      if (fromEnded) {
        this.isPlaying.set(false);
        this.audio.pause();
      }
      return;
    }
    this.index.set(nextIndex);
    this.load(true);
  }

  previous(): void {
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }
    const previousIndex = this.index() - 1;
    if (previousIndex < 0) {
      this.seek(0);
      return;
    }
    this.index.set(previousIndex);
    this.load(true);
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : seconds;
    const next = Math.min(Math.max(0, seconds), duration || seconds);
    this.audio.currentTime = next;
    this.currentTime.set(next);
  }

  setVolume(value: number): void {
    const volume = Math.min(1, Math.max(0, value));
    this.volume.set(volume);
    this.audio.volume = volume;
  }

  releaseArtist(artistId: string, albumIds: ReadonlySet<string>): void {
    this.forget((track) => albumIds.has(track.albumId));
    this.queue.update((queue) => queue.map((track) => ({
      ...track,
      artists: track.artists.filter((artist) => artist.id !== artistId)
    })));
  }

  forget(match: (track: Track) => boolean): void {
    const current = this.current();
    const removingCurrent = !!current && match(current);
    const wasPlaying = this.isPlaying();
    const queue = this.queue().filter((track) => !match(track));

    if (removingCurrent) {
      if (!queue.length) {
        this.stop();
        return;
      }
      const nextIndex = Math.min(Math.max(this.index(), 0), queue.length - 1);
      this.queue.set(queue);
      this.index.set(nextIndex);
      this.load(wasPlaying);
      return;
    }

    this.queue.set(queue);
    this.index.set(current ? queue.findIndex((track) => track.id === current.id) : -1);
  }

  stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.queue.set([]);
    this.index.set(-1);
    this.currentTime.set(0);
    this.duration.set(0);
    this.isPlaying.set(false);
    this.error.set(null);
  }

  private load(autoplay: boolean): void {
    const track = this.current();
    this.error.set(null);
    this.currentTime.set(0);
    this.duration.set(track?.durationSeconds ?? 0);

    if (!track?.audioUrl) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.isPlaying.set(false);
      this.error.set('This track has no audio URL yet.');
      return;
    }

    this.audio.src = track.audioUrl;
    this.audio.load();
    if (autoplay) this.playCurrent();
  }

  private playCurrent(): void {
    void this.audio.play().catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      this.zone.run(() => this.error.set('Playback was blocked or the audio URL failed.'));
    });
  }
}
