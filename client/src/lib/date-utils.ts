export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(dateString: string, timeString: string): string {
  return `${formatDate(dateString)} at ${formatTime(timeString)}`;
}

export function getTimeUntilBooking(bookingDate: string, startTime: string): {
  hours: number;
  minutes: number;
  isPast: boolean;
} {
  const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
  const now = new Date();
  const timeDiff = bookingDateTime.getTime() - now.getTime();
  
  if (timeDiff < 0) {
    return { hours: 0, minutes: 0, isPast: true };
  }
  
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes, isPast: false };
}