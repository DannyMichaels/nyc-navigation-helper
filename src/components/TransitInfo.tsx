const formatTimeToTwelveHour = (time: string): string => {
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

import React, { useState } from 'react';
import { useVenueStore } from '../store/useVenueStore';
import { getEnhancedTransitWithLlama } from '../api/llamaApi';
import { Venue, TransitOption } from '../types';

// Helper component for rendering subway train symbols with correct MTA styling
const SubwayBullet: React.FC<{ line: string; color?: string }> = ({
  line,
  color,
}) => {
  // Default subway line colors if not provided
  const getDefaultColor = (line: string) => {
    const subwayColors: Record<string, string> = {
      A: '#0039A6',
      C: '#0039A6',
      E: '#0039A6',
      B: '#FF6319',
      D: '#FF6319',
      F: '#FF6319',
      M: '#FF6319',
      N: '#FCCC0A',
      Q: '#FCCC0A',
      R: '#FCCC0A',
      W: '#FCCC0A',
      '1': '#EE352E',
      '2': '#EE352E',
      '3': '#EE352E',
      '4': '#00933C',
      '5': '#00933C',
      '6': '#00933C',
      L: '#A7A9AC',
      '7': '#B933AD',
      G: '#6CBE45',
      J: '#996633',
      Z: '#996633',
      S: '#808183',
    };
    return subwayColors[line] || '#333333';
  };

  const bgColor = color || getDefaultColor(line);
  // Use white text for darker background colors, black for lighter ones
  const textColor = ['#FCCC0A'].includes(bgColor) ? '#000000' : '#FFFFFF';

  return (
    <div
      className="inline-flex items-center justify-center rounded-full font-bold"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        width: '1.75rem',
        height: '1.75rem',
        fontSize: '1rem',
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {line}
    </div>
  );
};

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
      const transitOptions = await getEnhancedTransitWithLlama(
        fromVenue,
        toVenue,
        arrivalTime
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

// Helper functions for transit options display
const getColorForOption = (option: TransitOption): string => {
  if (option.type === 'subway') {
    // Use trainColor if available
    if (option.trainColor) return option.trainColor;

    const subwayColors: Record<string, string> = {
      '1': '#EE352E',
      '2': '#EE352E',
      '3': '#EE352E',
      '4': '#00933C',
      '5': '#00933C',
      '6': '#00933C',
      A: '#0039A6',
      C: '#0039A6',
      E: '#0039A6',
      B: '#FF6319',
      D: '#FF6319',
      F: '#FF6319',
      M: '#FF6319',
      N: '#FCCC0A',
      Q: '#FCCC0A',
      R: '#FCCC0A',
      W: '#FCCC0A',
      L: '#A7A9AC',
      G: '#6CBE45',
      J: '#996633',
      Z: '#996633',
      '7': '#B933AD',
      S: '#808183',
    };

    if (option.line) {
      const line = option.line.split(',')[0].trim();
      return subwayColors[line] || '#333333';
    }
  } else if (option.type === 'walk') {
    return '#4285F4';
  } else if (option.type === 'bus') {
    return '#FF6D00';
  } else if (option.type === 'taxi' || option.type === 'uber') {
    return '#000000';
  }

  return '#333333';
};

const getIconForOption = (option: TransitOption): string => {
  // Specific handling for place names that might accidentally trigger 'S'
  if (
    option.name &&
    (option.name.toLowerCase().includes('station') ||
      option.name.toLowerCase().includes('terminal'))
  ) {
    // Use a more generic icon or the first letter of a relevant word
    if (option.type === 'subway')
      return option.line?.split(',')[0].trim() || 'T';
    return 'T'; // Terminal/Transport icon
  }

  if (option.type === 'subway') {
    return option.line?.split(',')[0].trim() || 'S';
  } else if (option.type === 'bus') {
    return 'B';
  } else if (option.type === 'walk') {
    return 'W';
  } else if (option.type === 'taxi') {
    return 'T';
  } else if (option.type === 'uber') {
    return 'U';
  }

  return '?';
};

export default TransitInfo;
