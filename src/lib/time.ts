export const formatTimeToTwelveHour = (time: string): string => {
  // Check if time already has AM/PM
  if (time.includes('AM') || time.includes('PM')) {
    return time;
  }

  // Try to parse the time string
  let hours: number;
  let minutes: number;

  // Handle different possible formats
  if (time.includes(':')) {
    // Format like "17:30"
    const [hoursStr, minutesStr] = time.split(':');
    hours = parseInt(hoursStr, 10);
    minutes = parseInt(minutesStr, 10);
  } else {
    // Format like "1730"
    if (time.length === 4) {
      hours = parseInt(time.substring(0, 2), 10);
      minutes = parseInt(time.substring(2, 4), 10);
    } else {
      // Default to current time if unparseable
      const now = new Date();
      hours = now.getHours();
      minutes = now.getMinutes();
    }
  }

  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // Convert 0 to 12 for 12 AM

  // Format the time properly
  return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
};
