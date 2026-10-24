import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AlbumDetail,
  AlbumSummary,
  ArtistDetail,
  ArtistSummary,
  Track,
  UpsertAlbum,
  UpsertArtist,
  UpsertTrack
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getArtists(): Observable<ArtistSummary[]> {
    return this.http.get<ArtistSummary[]>(`${this.base}/artists`);
  }

  getArtist(id: string): Observable<ArtistDetail> {
    return this.http.get<ArtistDetail>(`${this.base}/artists/${id}`);
  }

  createArtist(body: UpsertArtist): Observable<ArtistSummary> {
    return this.http.post<ArtistSummary>(`${this.base}/artists`, body);
  }

  updateArtist(id: string, body: UpsertArtist): Observable<ArtistSummary> {
    return this.http.put<ArtistSummary>(`${this.base}/artists/${id}`, body);
  }

  deleteArtist(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/artists/${id}`);
  }

  getAlbums(artistId?: string): Observable<AlbumSummary[]> {
    const params = artistId ? new HttpParams().set('artistId', artistId) : undefined;
    return this.http.get<AlbumSummary[]>(`${this.base}/albums`, { params });
  }

  getAlbum(id: string): Observable<AlbumDetail> {
    return this.http.get<AlbumDetail>(`${this.base}/albums/${id}`);
  }

  createAlbum(body: UpsertAlbum): Observable<AlbumSummary> {
    return this.http.post<AlbumSummary>(`${this.base}/albums`, body);
  }

  updateAlbum(id: string, body: UpsertAlbum): Observable<AlbumSummary> {
    return this.http.put<AlbumSummary>(`${this.base}/albums/${id}`, body);
  }

  deleteAlbum(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/albums/${id}`);
  }

  getTracks(albumId?: string): Observable<Track[]> {
    const params = albumId ? new HttpParams().set('albumId', albumId) : undefined;
    return this.http.get<Track[]>(`${this.base}/tracks`, { params });
  }

  createTrack(body: UpsertTrack): Observable<Track> {
    return this.http.post<Track>(`${this.base}/tracks`, body);
  }

  updateTrack(id: string, body: UpsertTrack): Observable<Track> {
    return this.http.put<Track>(`${this.base}/tracks/${id}`, body);
  }

  deleteTrack(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tracks/${id}`);
  }
}
