import React, { useState } from 'react';
import { useVenueStore } from '../store/useVenueStore';
import { getEnhancedTransitWithLlama } from '../api/llamaApi';
import { TransitOption } from '../types';
import SubwayBullet from './SubwayBullet';
import { getColorForOption, getIconForOption } from '../lib/transit';

const TransitInfo: React.FC = () => {
  const { venues, centerVenue } = useVenueStore();
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [arrivalTime, setArrivalTime] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [transitResults, setTransitResults] = useState<TransitOption[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTransit = async () => {
    if (!selectedVenue || !centerVenue) return;

    const fromVenue = venues.find((v) => v.id === centerVenue);
    const toVenue = venues.find((v) => v.id === selectedVenue);

    if (!fromVenue || !toVenue) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Pass current time from client
      const transitOptions = await getEnhancedTransitWithLlama(
        fromVenue,
        toVenue,
        arrivalTime,
        new Date() // Current time from client
      );
      setTransitResults(transitOptions);

      // Reset arrival time
      setArrivalTime('');
    } catch (error) {
      console.error('Error generating transit suggestions:', error);
      setError('Failed to generate transit options. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const centerVenueObj = centerVenue
    ? venues.find((v) => v.id === centerVenue)
    : venues.length > 0
    ? venues[0]
    : null;

  // Helper to process description text and add styled train bullets
  const formatTransitDescription = (description: string) => {
    if (!description) return null;

    // Regular expression to find subway line references
    // Matches patterns like "A train", "1, 2, 3 trains", "take the A", etc.
    const subwayLineRegex = /\b([ABCDEFGJLMNQRSW123456])\b(?:\s*train)?/gi;

    // Split by subway line references and process
    const parts = description.split(subwayLineRegex);

    return (
      <>
        {parts.map((part, index) => {
          // Even indexes are regular text
          if (index % 2 === 0) return part;

          // Odd indexes are subway line matches
          return <SubwayBullet key={index} line={part.toUpperCase()} />;
        })}
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-bold mb-4">Transit Options</h2>

      {centerVenueObj && (
        <div className="mb-4 space-y-3">
          <p className="text-sm">
            Get transit options from{' '}
            <span className="font-semibold">{centerVenueObj.name}</span> to:
          </p>

          <div className="flex gap-2">
            <select
              value={selectedVenue || ''}
              onChange={(e) => setSelectedVenue(e.target.value || null)}
              className="flex-grow p-2 border rounded-md"
              disabled={isGenerating}
            >
              <option value="">Select a destination</option>
              {venues
                .filter((v) => v.id !== centerVenue)
                .map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="p-2 border rounded-md"
              placeholder="Arrival Time (Optional)"
              disabled={isGenerating}
            />
            <span className="text-sm text-gray-600">
              ← Desired arrival time (optional)
            </span>
          </div>

          <button
            onClick={handleGenerateTransit}
            disabled={!selectedVenue || isGenerating}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Get Transit Options'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {isGenerating && (
        <div className="my-4 p-4 bg-gray-50 rounded-md flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5 text-blue-500 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Generating transit options with Llama AI...</span>
        </div>
      )}

      {transitResults && transitResults.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Transit Options:</h3>

          {transitResults.map((option, index) => (
            <div
              key={option.id}
              className={`p-4 bg-gray-50 rounded-md border ${
                option.recommended
                  ? 'border-blue-300 shadow-sm'
                  : 'border-gray-200'
              }`}
            >
              {/* Header with option name and details */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {option.type === 'subway' && option.line ? (
                    <SubwayBullet
                      line={option.line.charAt(0).toUpperCase()}
                      color={option.trainColor}
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: getColorForOption(option) }}
                    >
                      {getIconForOption(option)}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{option.name}</span>
                    {option.direction && (
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
                        {option.direction}
                      </span>
                    )}
                    {option.recommended && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {option.duration} min
                  </div>
                  {Number(option.cost) > 0 && (
                    <div className="text-gray-600">${option.cost}</div>
                  )}
                </div>
              </div>

              {/* Transit description with styled train bullets */}
              <div className="text-sm mb-3 border-l-4 border-gray-300 pl-3 py-1">
                {formatTransitDescription(option.description)}
              </div>

              {/* Timing information */}
              {option.departureTime && (
                <div className="flex justify-between text-xs bg-gray-100 p-2 rounded mb-3">
                  <span>
                    <strong>Depart:</strong> {option.departureTime}
                  </span>
                  <span>
                    <strong>Arrive:</strong> {option.arrivalTime}
                  </span>
                </div>
              )}

              {/* Pros and cons */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                {option.pros && option.pros.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-green-600 block mb-1">
                      Pros:
                    </span>
                    <ul className="text-xs text-gray-600 list-disc pl-4">
                      {option.pros.map((pro, i) => (
                        <li key={i}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {option.cons && option.cons.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-red-600 block mb-1">
                      Cons:
                    </span>
                    <ul className="text-xs text-gray-600 list-disc pl-4">
                      {option.cons.map((con, i) => (
                        <li key={i}>{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !isGenerating && !transitResults ? (
        <p className="text-gray-500 text-center py-4">
          Select a destination and generate transit options.
        </p>
      ) : transitResults && transitResults.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No transit options found for the selected destination.
        </p>
      ) : null}
    </div>
  );
};

export default TransitInfo;
