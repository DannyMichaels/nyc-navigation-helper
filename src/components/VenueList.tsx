import React from 'react';
import { useVenueStore } from '../store/useVenueStore';

const VenueList: React.FC = () => {
  const { venues, centerVenue, removeVenue, setCenterVenue } = useVenueStore();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-bold mb-4">Your Locations</h2>

      {venues.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No locations added yet. Add your first location above.
        </p>
      ) : (
        <div className="space-y-3">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className={`flex items-center p-2 rounded-md ${
                centerVenue === venue.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: venue.color }}
              >
                <span className="text-white text-xs font-bold">
                  {venue.shortName}
                </span>
              </div>

              <div className="flex-grow">
                <h3 className="font-medium text-sm">{venue.name}</h3>
                <p className="text-xs text-gray-600 truncate">
                  {venue.address}
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setCenterVenue(venue.id)}
                  className={`p-1 text-xs ${
                    centerVenue === venue.id
                      ? 'text-blue-700 font-bold'
                      : 'text-blue-500 hover:text-blue-700'
                  }`}
                  title={
                    centerVenue === venue.id
                      ? 'This is your center point'
                      : 'Set as center point'
                  }
                >
                  {centerVenue === venue.id ? 'Center' : 'Set Center'}
                </button>

                <button
                  onClick={() => removeVenue(venue.id)}
                  className="p-1 text-xs text-red-500 hover:text-red-700"
                  title="Remove location"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenueList;
