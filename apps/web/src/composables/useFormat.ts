export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const rest = total % 60;
  const tail = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;

  return hours > 0 ? `${String(hours).padStart(2, '0')}:${tail}` : tail;
}

export function formatPercent(value: number, total: number): string {
  if (!Number.isFinite(total) || total <= 0) {
    return '0%';
  }

  return `${Math.min(100, Math.max(0, (value / total) * 100)).toFixed(0)}%`;
}
