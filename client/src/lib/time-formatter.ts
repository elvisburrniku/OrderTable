
import { format, toZonedTime, fromZonedTime } from "date-fns-tz";
import { format as formatDate, parse } from "date-fns";

export interface TimeFormatOptions {
  timeFormat?: "12h" | "24h";
  dateFormat?: string;
  timeZone?: string;
}

export function formatTime(time: string | Date, options: TimeFormatOptions = {}): string {
  const { timeFormat = "12h", timeZone = "UTC" } = options;
  
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

  // Convert to specified timezone
  const zonedDate = toZonedTime(dateObj, timeZone);

  if (timeFormat === "24h") {
    return format(zonedDate, "HH:mm", { timeZone });
  } else {
    return format(zonedDate, "h:mm a", { timeZone });
  }
}

export function formatDateTime(datetime: string | Date, options: TimeFormatOptions = {}): string {
  const { timeFormat = "12h", dateFormat = "MM/dd/yyyy", timeZone = "UTC" } = options;
  
  const dateObj = typeof datetime === "string" ? new Date(datetime) : datetime;
  
  if (isNaN(dateObj.getTime())) {
    return datetime.toString();
  }

  // Convert to specified timezone
  const zonedDate = toZonedTime(dateObj, timeZone);
  
  const formattedDate = format(zonedDate, dateFormat, { timeZone });
  const formattedTime = formatTime(dateObj, { timeFormat, timeZone });
  
  return `${formattedDate} ${formattedTime}`;
}

export function formatDate(date: string | Date, options: TimeFormatOptions = {}): string {
  const { dateFormat = "MM/dd/yyyy", timeZone = "UTC" } = options;
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return date.toString();
  }

  // Convert to specified timezone for date formatting
  const zonedDate = toZonedTime(dateObj, timeZone);
  return format(zonedDate, dateFormat, { timeZone });
}

export function convertToTimezone(date: Date, timeZone: string): Date {
  return toZonedTime(date, timeZone);
}

export function convertFromTimezone(date: Date, timeZone: string): Date {
  return fromZonedTime(date, timeZone);
}

export function getSupportedTimezones() {
  return [
    { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
    { value: "America/Chicago", label: "Central Time (CST/CDT)" },
    { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKST/AKDT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
    { value: "UTC", label: "UTC" },
    { value: "Europe/London", label: "GMT/BST" },
    { value: "Europe/Paris", label: "CET/CEST" },
    { value: "Europe/Berlin", label: "CET/CEST" },
    { value: "Asia/Tokyo", label: "JST" },
    { value: "Asia/Shanghai", label: "CST" },
    { value: "Australia/Sydney", label: "AEST/AEDT" },
  ];
}
