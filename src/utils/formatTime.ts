export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');

  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs}`
    : `${mins}:${secs}`;
}
