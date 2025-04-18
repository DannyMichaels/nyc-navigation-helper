import React, { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import { useVenueStore } from '../store/useVenueStore';
import { getTransitSuggestionWithLlama } from '../api/llamaApi';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Legend Component
const MapLegend: React.FC<{ venues: any[] }> = ({ venues }) => {
  // Get unique venue types from venues
  const venueTypes = [...new Set(venues.map((venue) => venue.type))];

  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar bg-white p-4 rounded-lg shadow-lg">
        <h3 className="font-bold mb-2">Venue Types</h3>
        <div className="space-y-2">
          {venueTypes.map((type) => {
            const venue = venues.find((v) => v.type === type);
            return venue ? (
              <div key={type} className="flex items-center">
                <div
                  className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                  style={{
                    backgroundColor: venue.color,
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  {venue.shortName}
                </div>
                <span className="capitalize">{type}</span>
              </div>
            ) : null;
          })}
        </div>
        <div className="mt-2 border-t pt-2">
          <h4 className="font-semibold text-sm mb-1">Routes</h4>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-6 h-1 bg-blue-500 mr-2"></div>
              <span className="text-xs">Transit Route</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1 bg-blue-500 mr-2 border-dashed border-blue-500 border-2"></div>
              <span className="text-xs">Walking Route</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapView: React.FC = () => {
  const { venues, transitOptions, centerVenue, addTransitOption } =
    useVenueStore();
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const centerVenueObj = centerVenue
    ? venues.find((v) => v.id === centerVenue)
    : venues.length > 0
    ? venues[0]
    : null;

  // Create a custom icon for each venue
  const createVenueIcon = (venue: (typeof venues)[0]) => {
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background-color: ${venue.color}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold; border: 2px solid white;">${venue.shortName}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  const generateRoute = async (fromId: string, toId: string) => {
    const fromVenue = venues.find((v) => v.id === fromId);
    const toVenue = venues.find((v) => v.id === toId);

    if (!fromVenue || !toVenue) {
      setRouteError('Could not find venues to generate route.');
      return;
    }

    setIsGeneratingRoute(true);
    setRouteError(null);

    try {
      const transitSuggestion = await getTransitSuggestionWithLlama(
        fromVenue,
        toVenue
      );

      addTransitOption({
        ...transitSuggestion,
        id: `transit-${Date.now()}`,
      } as any);
    } catch (error) {
      console.error('Error generating route:', error);
      setRouteError('Failed to generate route. Please try again.');
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  if (!centerVenueObj) {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-500">Add locations to view the map.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="h-96 rounded-md overflow-hidden relative">
        <MapContainer
          center={centerVenueObj.coordinates}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {venues.map((venue) => (
            <Marker
              key={venue.id}
              position={venue.coordinates}
              icon={createVenueIcon(venue)}
              eventHandlers={{
                click: () => setSelectedVenue(venue.id),
              }}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold">{venue.name}</h3>
                  <p className="text-sm text-gray-600">{venue.address}</p>

                  {venue.id !== centerVenue && (
                    <button
                      onClick={() =>
                        generateRoute(centerVenue || venues[0].id, venue.id)
                      }
                      disabled={isGeneratingRoute}
                      className="mt-2 text-sm text-blue-500 hover:underline disabled:opacity-50"
                    >
                      {isGeneratingRoute
                        ? 'Generating route...'
                        : 'Show route from center'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {transitOptions.map((option) => {
            const fromVenue = venues.find((v) => v.id === option.from);
            const toVenue = venues.find((v) => v.id === option.to);

            if (!fromVenue || !toVenue) return null;

            return (
              <Polyline
                key={option.id}
                positions={[fromVenue.coordinates, toVenue.coordinates]}
                color={option.color}
                weight={4}
                dashArray={option.type === 'walk' ? '5,10' : undefined}
              />
            );
          })}

          {/* <MapLegend venues={venues} /> */}
        </MapContainer>
      </div>

      {routeError && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {routeError}
        </div>
      )}
    </div>
  );
};

export default MapView;
