import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  forwardRef,
  input,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ArtistSummary } from '../core/models';

@Component({
  selector: 'app-artist-multi-select',
  templateUrl: './artist-multi-select.component.html',
  styleUrl: './artist-multi-select.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ArtistMultiSelectComponent),
    multi: true
  }]
})
export class ArtistMultiSelectComponent implements ControlValueAccessor, OnDestroy {
  private static readonly maxArtists = 12;

  readonly artists = input<ArtistSummary[]>([]);
  readonly query = signal('');
  readonly open = signal(false);
  readonly activeIndex = signal(0);
  readonly disabled = signal(false);
  readonly menuTop = signal(0);
  readonly menuLeft = signal(0);
  readonly menuWidth = signal(0);

  @ViewChild('search') private readonly search?: ElementRef<HTMLInputElement>;

  private readonly selectedIds = signal<string[]>([]);
  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selected = computed(() => {
    const byId = new Map(this.artists().map((artist) => [artist.id, artist]));
    return this.selectedIds()
      .map((id) => byId.get(id))
      .filter((artist): artist is ArtistSummary => !!artist);
  });

  readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    const selected = new Set(this.selectedIds());
    return this.artists().filter((artist) =>
      !selected.has(artist.id) && artist.name.toLowerCase().includes(query));
  });

  readonly atLimit = computed(() => this.selectedIds().length >= ArtistMultiSelectComponent.maxArtists);

  private readonly reposition = (): void => {
    if (this.open()) this.placeMenu();
  };

  constructor(private readonly host: ElementRef<HTMLElement>) {
    document.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
  }

  writeValue(value: string[] | null): void {
    this.selectedIds.set(Array.isArray(value) ? value : []);
    this.activeIndex.set(0);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  onQuery(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.query.set(event.target.value);
    this.activeIndex.set(0);
    this.openList();
  }

  openList(): void {
    if (this.disabled()) return;
    this.placeMenu();
    this.open.set(true);
  }

  pick(artistId: string, event?: Event): void {
    event?.preventDefault();
    if (this.disabled() || this.atLimit() || this.selectedIds().includes(artistId)) return;
    this.commit([...this.selectedIds(), artistId]);
    this.query.set('');
    this.activeIndex.set(0);
    this.openList();
  }

  remove(artistId: string): void {
    if (this.disabled()) return;
    this.commit(this.selectedIds().filter((id) => id !== artistId));
  }

  onKey(event: KeyboardEvent): void {
    const matches = this.matches();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!matches.length) {
        this.open.set(true);
        return;
      }
      if (!this.open()) {
        this.open.set(true);
        this.activeIndex.set(event.key === 'ArrowUp' ? matches.length - 1 : 0);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.update((index) => (index + direction + matches.length) % matches.length);
      return;
    }

    if (event.key === 'Enter' && this.open()) {
      event.preventDefault();
      const artist = matches[this.activeIndex()];
      if (artist) this.pick(artist.id);
      return;
    }

    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.open.set(false);
      return;
    }

    if (event.key === 'Backspace' && !this.query() && this.selectedIds().length) {
      this.commit(this.selectedIds().slice(0, -1));
    }
  }

  onBlur(): void {
    this.onTouched();
    setTimeout(() => {
      if (!this.host.nativeElement.contains(document.activeElement)) this.open.set(false);
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target instanceof Node) || this.host.nativeElement.contains(event.target)) return;
    this.open.set(false);
  }

  private placeMenu(): void {
    const input = this.search?.nativeElement;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const height = Math.min(180, Math.max(this.matches().length, 1) * 40 + 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < height + 8 && rect.top > height
      ? rect.top - height - 4
      : rect.bottom + 4;
    this.menuTop.set(top);
    this.menuLeft.set(rect.left);
    this.menuWidth.set(rect.width);
  }

  private commit(ids: string[]): void {
    this.selectedIds.set(ids);
    this.onChange(ids);
    this.onTouched();
  }
}
