import React, { useState } from 'react';
import { useVenueStore } from '../store/useVenueStore';
import { geocodeAddressWithLlama } from '../api/llamaApi';

const AddVenueForm: React.FC = () => {
  const { addVenue } = useVenueStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [address, setAddress] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !address) {
      setError('Name and address are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate a short name if not provided
      const venueShortName =
        shortName ||
        name
          .split(' ')
          .map((word) => word[0])
          .join('')
          .toUpperCase();

      // Geocode the address using Llama
      const coordinates = await geocodeAddressWithLlama(address);

      // Add venue to store
      addVenue({
        id: `venue-${Date.now()}`,
        name,
        shortName: venueShortName,
        address,
        coordinates,
        color: customColor || undefined,
      });

      // Reset form
      setName('');
      setShortName('');
      setAddress('');
      setCustomColor('');
      setShowColorPicker(false);
    } catch (error) {
      setError('Failed to geocode address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-bold mb-4">Add New Location</h2>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="e.g. Madame X"
            disabled={isLoading}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="shortName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Short Name/Label (optional)
          </label>
          <input
            type="text"
            id="shortName"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="e.g. MDX"
            maxLength={4}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Max 4 characters. If left blank, will be auto-generated.
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Address
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="e.g. 94 W Houston St, New York, NY"
            disabled={isLoading}
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center">
            <label className="block text-sm font-medium text-gray-700 mr-2">
              Marker Color
            </label>
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="text-sm text-blue-500"
            >
              {showColorPicker ? 'Hide' : 'Choose Color'}
            </button>
          </div>

          {showColorPicker && (
            <div className="mt-2 grid grid-cols-6 gap-2">
              {[
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
              ].map((color) => (
                <div
                  key={color}
                  className={`w-8 h-8 rounded-full cursor-pointer ${
                    color === customColor ? 'ring-2 ring-black' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCustomColor(color)}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Location'}
        </button>
      </form>
    </div>
  );
};

export default AddVenueForm;
