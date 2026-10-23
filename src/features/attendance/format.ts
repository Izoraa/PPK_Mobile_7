export function formatAttendanceTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
