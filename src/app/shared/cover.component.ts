import { Component, effect, input, signal, untracked } from '@angular/core';
import { coverGradient, initials } from '../core/format';

@Component({
  selector: 'app-cover',
  template: `
    @if (src() && !failed()) {
      <img [src]="src()!" [alt]="alt()" (error)="failed.set(true)" />
    } @else {
      <span class="fallback" [style.background]="gradient()">{{ label() }}</span>
    }
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    img, .fallback {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: grid;
      place-items: center;
      color: #f6f1e7;
      font-family: Fraunces, Georgia, serif;
      font-size: 1.35rem;
      letter-spacing: 0.04em;
    }
  `
})
export class CoverComponent {
  readonly src = input<string | null | undefined>(null);
  readonly alt = input('');
  readonly seed = input('');
  readonly failed = signal(false);

  constructor() {
    effect(() => {
      this.src();
      untracked(() => this.failed.set(false));
    });
  }

  gradient(): string {
    return coverGradient(this.seed() || this.alt() || 'stopify');
  }

  label(): string {
    return initials(this.seed() || this.alt() || '?');
  }
}
