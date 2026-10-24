import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EditorService } from './core/editor.service';
import { PlayerService } from './core/player.service';
import { EditorDialogComponent } from './shared/editor-dialog.component';
import { PlayerBarComponent } from './shared/player-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PlayerBarComponent, EditorDialogComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  readonly editor = inject(EditorService);
  readonly player = inject(PlayerService);

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.code !== 'Space' || this.editor.request()) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || target.isContentEditable) {
      return;
    }
    if (!this.player.current()) return;
    event.preventDefault();
    this.player.toggle();
  }
}
