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

export const convertToEST = (date: Date): Date => {
  // Create a new date object in EST
  const estDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  return estDate;
};

export const calculateOptimalDeparture = (
  currentTime: Date,
  desiredArrivalTime?: string
): { departureTime: Date; maxTravelTime: number } => {
  // Convert current time to EST
  const estCurrentTime = convertToEST(currentTime);

  // If no arrival time specified, default to a standard commute time
  if (!desiredArrivalTime) {
    // Default to a 45-minute travel time
    const defaultDeparture = new Date(estCurrentTime);
    defaultDeparture.setMinutes(defaultDeparture.getMinutes() + 45);
    return {
      departureTime: defaultDeparture,
      maxTravelTime: 45,
    };
  }

  // Parse desired arrival time
  const [hours, minutes] = desiredArrivalTime.split(':').map(Number);
  const desiredArrival = new Date(estCurrentTime);
  desiredArrival.setHours(hours, minutes, 0, 0);

  // If desired arrival is earlier today, use it; otherwise, use tomorrow
  if (desiredArrival <= estCurrentTime) {
    desiredArrival.setDate(desiredArrival.getDate() + 1);
  }

  // Calculate maximum travel time
  const timeDiff =
    (desiredArrival.getTime() - estCurrentTime.getTime()) / (1000 * 60);

  // Subtract some buffer time for transfers and walking
  const maxTravelTime = Math.max(15, Math.floor(timeDiff - 15));

  // Calculate latest possible departure
  const departureTime = new Date(desiredArrival);
  departureTime.setMinutes(departureTime.getMinutes() - maxTravelTime);

  return {
    departureTime,
    maxTravelTime,
  };
};
