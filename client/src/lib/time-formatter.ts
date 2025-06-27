
import { format, parse } from "date-fns";

export interface TimeFormatOptions {
  timeFormat?: "12h" | "24h";
  dateFormat?: string;
  timeZone?: string;
}

export function formatTime(time: string | Date, options: TimeFormatOptions = {}): string {
  const { timeFormat = "12h" } = options;
  
  let dateObj: Date;
  
  if (typeof time === "string") {
    // Handle different time string formats
    if (time.includes("T")) {
      // ISO format
      dateObj = new Date(time);
    } else if (time.match(/^\d{2}:\d{2}$/)) {
      // HH:mm format
      dateObj = parse(time, "HH:mm", new Date());
    } else if (time.match(/^\d{1,2}:\d{2}$/)) {
      // H:mm format
      dateObj = parse(time, "H:mm", new Date());
    } else {
      // Try to parse as-is
      dateObj = new Date(time);
    }
  } else {
    dateObj = time;
  }

  if (isNaN(dateObj.getTime())) {
    return time.toString(); // Return original if parsing fails
  }

  if (timeFormat === "24h") {
    return format(dateObj, "HH:mm");
  } else {
    return format(dateObj, "h:mm a");
  }
}

export function formatDateTime(datetime: string | Date, options: TimeFormatOptions = {}): string {
  const { timeFormat = "12h", dateFormat = "MM/dd/yyyy" } = options;
  
  const dateObj = typeof datetime === "string" ? new Date(datetime) : datetime;
  
  if (isNaN(dateObj.getTime())) {
    return datetime.toString();
  }

  const formattedDate = format(dateObj, dateFormat);
  const formattedTime = formatTime(dateObj, { timeFormat });
  
  return `${formattedDate} ${formattedTime}`;
}

export function formatDate(date: string | Date, options: TimeFormatOptions = {}): string {
  const { dateFormat = "MM/dd/yyyy" } = options;
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return date.toString();
  }

  return format(dateObj, dateFormat);
}
