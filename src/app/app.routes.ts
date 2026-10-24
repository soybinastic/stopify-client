import { Routes } from '@angular/router';
import { AlbumDetailComponent } from './pages/album-detail.component';
import { AlbumsComponent } from './pages/albums.component';
import { ArtistDetailComponent } from './pages/artist-detail.component';
import { ArtistsComponent } from './pages/artists.component';
import { LibraryComponent } from './pages/library.component';

export const routes: Routes = [
  { path: '', component: LibraryComponent },
  { path: 'artists', component: ArtistsComponent },
  { path: 'artists/:id', component: ArtistDetailComponent },
  { path: 'albums', component: AlbumsComponent },
  { path: 'albums/:id', component: AlbumDetailComponent },
  { path: '**', redirectTo: '' }
];
