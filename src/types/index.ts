export interface Venue {
  id: string;
  name: string;
  shortName: string;
  address: string;
  coordinates: [number, number]; // [latitude, longitude]
  color: string;
}

export interface TransitOption {
  id: string;
  from: string;
  to: string;
  type:
    | 'subway'
    | 'bus'
    | 'walk'
    | 'taxi'
    | 'uber'
    | 'lirr'
    | 'metro-north'
    | 'multimodal';
  name: string;
  description: string;
  duration: number;
  cost?: number;
  line?: string;
  direction?:
    | 'Downtown'
    | 'Uptown'
    | 'Brooklyn-bound'
    | 'Queens-bound'
    | 'Bronx-bound'
    | 'Manhattan-bound'
    | 'Eastbound'
    | 'Westbound'
    | string;
  trainSymbol?: string;
  trainColor?: string;
  departureTime?: string;
  arrivalTime?: string;
  pros?: string[];
  cons?: string[];
  recommended?: boolean;
  color: string;
  steps?: string[]; // Added steps to the type
  realtimeStatus?: 'OnTime' | 'Delayed' | 'Cancelled';
  estimatedArrival?: Date;
}

export interface CompassTemplate {
  id: string;
  name: string;
  svgGenerator: (venues: Venue[], center: Venue | null) => string;
}
