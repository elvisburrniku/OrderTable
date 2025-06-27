
import { useDate } from '@/contexts/date-context';

export function useDateFormatting() {
  return useDate();
}

// Export individual formatters for backwards compatibility
export const useFormatDate = () => {
  const { formatDate } = useDate();
  return formatDate;
};

export const useFormatTime = () => {
  const { formatTime } = useDate();
  return formatTime;
};

export const useFormatDateTime = () => {
  const { formatDateTime } = useDate();
  return formatDateTime;
};
