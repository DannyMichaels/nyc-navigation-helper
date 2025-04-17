import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Venue, TransitOption } from '../types';

interface VenueState {
  venues: Venue[];
  transitOptions: TransitOption[];
  centerVenue: string | null;
  addVenue: (venue: Venue) => void;
  updateVenue: (id: string, venue: Partial<Venue>) => void;
  removeVenue: (id: string) => void;
  setCenterVenue: (id: string | null) => void;
  addTransitOption: (option: TransitOption) => void;
  updateTransitOption: (id: string, option: Partial<TransitOption>) => void;
  removeTransitOption: (id: string) => void;
}

// Generate a random color for new venues
const generateRandomColor = () => {
  const colors = [
    '#4285F4',
    '#DB4437',
    '#0F9D58',
    '#FF6D00',
    '#9C27B0',
    '#00BCD4',
    '#8BC34A',
    '#FFC107',
    '#795548',
    '#607D8B',
    '#FF5722',
    '#673AB7',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useVenueStore = create<VenueState>()(
  persist(
    (set) => ({
      venues: [
        {
          id: 'penn',
          name: 'Penn Station',
          shortName: 'PENN',
          address: '7th Ave & 32nd St, New York, NY',
          coordinates: [40.750323, -73.991659],
          color: '#4285F4',
        },
        {
          id: 'fiveiron',
          name: 'Five Iron Golf',
          shortName: '5i',
          address: '883 6th Ave, 3rd Floor, New York, NY',
          coordinates: [40.747951, -73.988569],
          color: '#DB4437',
        },
      ],
      transitOptions: [],
      centerVenue: 'penn',

      addVenue: (venue) =>
        set((state) => ({
          venues: [
            ...state.venues,
            {
              ...venue,
              id: venue.id || `venue-${Date.now()}`,
              color: venue.color || generateRandomColor(),
            },
          ],
        })),

      updateVenue: (id, updatedVenue) =>
        set((state) => ({
          venues: state.venues.map((venue) =>
            venue.id === id ? { ...venue, ...updatedVenue } : venue
          ),
        })),

      removeVenue: (id) =>
        set((state) => ({
          venues: state.venues.filter((venue) => venue.id !== id),
          transitOptions: state.transitOptions.filter(
            (option) => option.from !== id && option.to !== id
          ),
          centerVenue: state.centerVenue === id ? null : state.centerVenue,
        })),

      setCenterVenue: (id) =>
        set(() => ({
          centerVenue: id,
        })),

      addTransitOption: (option) =>
        set((state) => ({
          transitOptions: [
            ...state.transitOptions,
            {
              ...option,
              id: option.id || `transit-${Date.now()}`,
            },
          ],
        })),

      updateTransitOption: (id, updatedOption) =>
        set((state) => ({
          transitOptions: state.transitOptions.map((option) =>
            option.id === id ? { ...option, ...updatedOption } : option
          ),
        })),

      removeTransitOption: (id) =>
        set((state) => ({
          transitOptions: state.transitOptions.filter(
            (option) => option.id !== id
          ),
        })),
    }),
    {
      name: 'nyc-legend-storage',
    }
  )
);
