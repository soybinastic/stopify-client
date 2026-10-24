import { HttpErrorResponse } from '@angular/common/http';

export function formatClock(totalSeconds: number | null | undefined): string {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '—';
  }
  return formatClock(totalSeconds);
}

export function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function artistNames(artists: { name: string }[] | null | undefined): string {
  return (artists ?? []).map((artist) => artist.name).join(', ');
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function coverGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  const secondHue = (hue + 42) % 360;
  return `linear-gradient(150deg, hsl(${hue} 58% 46%), hsl(${secondHue} 38% 22%))`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  return letters || '•';
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Try again.';
  }

  if (error.status === 0) {
    return 'Cannot reach the Stopify API. Start PostgreSQL and the backend, then try again.';
  }

  const body: unknown = error.error;
  if (typeof body === 'string' && body.trim()) return body;

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const message = record['message'];
    if (typeof message === 'string') return message;

    const errors = record['errors'];
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && first.length > 0) return String(first[0]);
    }
  }

  if (error.status === 404) return 'That record no longer exists.';
  if (error.status === 409) return 'That track number is already used on this album.';
  return 'Something went wrong. Try again.';
}
