import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatClock } from '../core/format';
import { PlayerService } from '../core/player.service';
import { CoverComponent } from './cover.component';

@Component({
  selector: 'app-player-bar',
  imports: [RouterLink, CoverComponent],
  templateUrl: './player-bar.component.html'
})
export class PlayerBarComponent {
  readonly player = inject(PlayerService);
  readonly scrubbing = signal(false);
  readonly formatClock = formatClock;

  readonly maxTime = computed(() => {
    const live = this.player.duration();
    if (live > 0) return live;
    return this.player.current()?.durationSeconds ?? 0;
  });

  startScrub(): void {
    this.scrubbing.set(true);
  }

  finishScrub(input: HTMLInputElement): void {
    this.scrubbing.set(false);
    this.player.seek(input.valueAsNumber);
  }

  setVolume(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.player.setVolume(event.target.valueAsNumber);
    }
  }
}
