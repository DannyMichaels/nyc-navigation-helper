import React, { useEffect, useState, useRef } from 'react';
import { useVenueStore } from '../store/useVenueStore';
import { generateSvgWithLlama } from '../api/llamaApi';
import { toPng } from 'html-to-image';

const CompassView: React.FC = () => {
  const { venues, centerVenue } = useVenueStore();
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compassRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateSvg = async () => {
      if (venues.length === 0) {
        setSvgContent(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const centerVenueObj = centerVenue
          ? venues.find((v) => v.id === centerVenue)
          : venues[0];

        // Enhance the SVG generation prompt to create a more accurate compass
        const svg = await generateSvgWithLlama(venues, centerVenueObj);
        setSvgContent(svg);
      } catch (err) {
        console.error('Error generating SVG:', err);
        setError('Failed to generate compass. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    generateSvg();
  }, [venues, centerVenue]);

  const downloadImage = async () => {
    if (!compassRef.current) return;

    try {
      const dataUrl = await toPng(compassRef.current);
      const link = document.createElement('a');
      link.download = 'nyc-legend-compass.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
      setError('Failed to download image. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">NYC Legend Compass</h2>

        <button
          onClick={downloadImage}
          disabled={isLoading || !svgContent}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50"
        >
          Download PNG
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div ref={compassRef} className="relative bg-white rounded-lg p-2">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-2"
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
              <p>Generating compass with Llama AI...</p>
            </div>
          </div>
        ) : !svgContent ? (
          <div className="h-96 flex items-center justify-center">
            <p className="text-gray-500">
              Add locations to generate a compass.
            </p>
          </div>
        ) : (
          <div
            className="w-full max-w-2xl mx-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          SVG compass generated dynamically with Llama AI, based on your added
          locations. The{' '}
          {centerVenue
            ? venues.find((v) => v.id === centerVenue)?.name
            : 'first location'}{' '}
          is used as the center point.
        </p>
      </div>
    </div>
  );
};

export default CompassView;
