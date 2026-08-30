const STORAGE_KEY = 'manivela:episode-progress';

export interface StoredProgress {
  position: number;
  duration: number;
  updatedAt: number;
}

type ProgressMap = Record<string, StoredProgress>;

function readAll(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function getLocalProgress(movieId: string): StoredProgress | null {
  return readAll()[movieId] ?? null;
}

export function getAllLocalProgress(): ProgressMap {
  return readAll();
}

export function saveLocalProgress(movieId: string, position: number, duration: number) {
  if (!movieId || !Number.isFinite(position) || position < 0) return;
  try {
    const all = readAll();
    all[movieId] = {
      position,
      duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore quota / private mode errors
  }
}
