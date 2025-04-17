import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useVenueStore } from '../store/useVenueStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image'; // Add this import
import { generateSvgWithLlama } from '../api/llamaApi';

const AIAssistant: React.FC = () => {
  const { venues, centerVenue } = useVenueStore();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapSvg, setMapSvg] = useState<string | null>(null);

  // Add refs for export functionality
  const responseRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    setResponse(null);
    setMapSvg(null);
    setError(null);

    try {
      // Construct a prompt that includes context about the venues
      const venuesContext = venues
        .map(
          (v) =>
            `${v.name} (${v.shortName}): ${v.address}, coordinates: [${v.coordinates[0]}, ${v.coordinates[1]}]`
        )
        .join('\n');

      const centerVenueObj = centerVenue
        ? venues.find((v) => v.id === centerVenue)
        : venues.length > 0
        ? venues[0]
        : null;

      const centerVenueContext = centerVenueObj
        ? `The current center/reference point is: ${centerVenueObj.name} at ${centerVenueObj.address}`
        : 'No center point set.';

      const fullPrompt = `
As an NYC navigation assistant, please answer this question with SPECIFIC, DETAILED information:

"${query}"

Here are the locations currently on my map:
${venuesContext}

${centerVenueContext}

When providing directions or transit options:
1. Give MULTIPLE route options (2-3 different ways to get there)
2. For each option, include SPECIFIC subway lines, bus routes, or walking directions with street names
3. List estimated travel times for each option
4. Note pros and cons of each transit option (crowds, reliability, scenic views, etc.)
5. If applicable, mention estimated costs
6. Give specific street-by-street walking directions when relevant
7. If asked about timing, calculate when someone should leave to arrive at a specific time

Your response should be COMPREHENSIVE and SPECIFIC, focusing on NYC navigation, venues, transit options, and directions.

Format your response using proper Markdown formatting:
- Use **bold** for important information like subway line names, travel times, and costs
- Use *italics* for pros and cons
- Use Markdown headings (## and ###) to organize different route options
- Use numbered lists for step-by-step directions
- Use bullet points for pros and cons lists
- Use tables when comparing multiple options side by side

This formatting will make your response more readable and structured.
`;

      const response = await axios.post('http://localhost:11434/api/chat', {
        model: 'llama3.2',
        messages: [
          {
            role: 'system',
            content:
              'You are a specialized NYC navigation assistant that provides extremely detailed and specific directions, transit options, and timetables. You provide multiple options and include very specific information like street names, subway entrances, transfer points, and walking directions. You are expert at calculating travel times in NYC. Use Markdown formatting to structure your responses in a clear, readable way, if there are multiple routes, you can also add a table with headers such as: Route Details,	Estimated Travel Time,	Pros, and Cons depending on the requirements.',
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        stream: false,
      });

      setResponse(response.data.message.content);
    } catch (error) {
      console.error('Error calling AI assistant:', error);
      setError(
        'Failed to connect to Llama AI. Make sure the server is running at http://localhost:11434/api/chat'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate a route map/compass visualization
  const handleGenerateMap = async () => {
    if (!response || venues.length < 2) return;

    setIsGeneratingMap(true);
    setError(null);

    try {
      const centerVenueObj = centerVenue
        ? venues.find((v) => v.id === centerVenue)
        : venues[0];

      // Extract destination from query (approximate method)
      let destinationTerms = ['to', 'from', 'between', 'and'];
      let destinationName = null;

      for (const term of destinationTerms) {
        const regex = new RegExp(
          `\\b${term}\\s+([\\w\\s]+?)(?:\\s+by|\\s+to|\\s+from|\\s+at|\\s+in|\\?|\\.|$)`,
          'i'
        );
        const match = query.match(regex);

        if (match && match[1]) {
          destinationName = match[1].trim();
          break;
        }
      }

      // Find the venue that best matches the destination
      let destinationVenue = null;
      if (destinationName) {
        destinationVenue = venues.find(
          (v) =>
            v.name.toLowerCase().includes(destinationName.toLowerCase()) ||
            destinationName.toLowerCase().includes(v.name.toLowerCase())
        );
      }

      // If we couldn't find a destination, use a subset of venues to visualize a general map
      const venuesToUse = destinationVenue
        ? [centerVenueObj, destinationVenue]
        : venues.slice(0, Math.min(5, venues.length));

      // Generate SVG for route map
      const svg = await generateSvgWithLlama(venuesToUse, centerVenueObj);
      setMapSvg(svg);
    } catch (error) {
      console.error('Error generating map:', error);
      setError('Failed to generate route map. Please try again.');
    } finally {
      setIsGeneratingMap(false);
    }
  };

  // Function to copy response to clipboard
  const handleCopyDirections = async () => {
    if (!response) return;

    try {
      await navigator.clipboard.writeText(response);
      // Temporarily show feedback
      const button = document.getElementById('copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setError('Failed to copy directions. Please try again.');
    }
  };

  // Function to print the directions
  const handlePrintDirections = () => {
    if (!responseRef.current) return;

    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError('Pop-up blocked. Please allow pop-ups to print directions.');
        return;
      }

      // Style for print window
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>NYC Directions: ${query}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { font-size: 18px; color: #333; }
            h2 { font-size: 16px; color: #2563eb; margin-top: 20px; }
            h3 { font-size: 14px; color: #4285f4; }
            p { margin-bottom: 10px; }
            ul, ol { margin-bottom: 10px; }
            li { margin-bottom: 5px; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .timestamp { color: #666; font-size: 12px; margin-bottom: 15px; }
            .query { font-style: italic; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>NYC Navigation Directions</h1>
          <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
          <div class="query">Query: "${query}"</div>
          <div>${responseRef.current.innerHTML}</div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();

      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        // Only close automatically if the user doesn't proceed with printing
        setTimeout(() => {
          if (printWindow && !printWindow.document.execCommand('print')) {
            printWindow.close();
          }
        }, 1000);
      }, 500);
    } catch (error) {
      console.error('Error printing directions:', error);
      setError('Failed to print directions. Please try again.');
    }
  };

  // Function to export response as image
  const handleExportAsImage = async () => {
    if (!responseRef.current) return;

    try {
      const dataUrl = await toPng(responseRef.current);
      const link = document.createElement('a');
      link.download = 'nyc-directions.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting as image:', error);
      setError('Failed to export as image. Please try again.');
    }
  };

  // Function to download map as PNG
  const handleDownloadMap = async () => {
    if (!mapRef.current) return;

    try {
      const dataUrl = await toPng(mapRef.current);
      const link = document.createElement('a');
      link.download = 'nyc-route-map.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error downloading map:', error);
      setError('Failed to download map. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-bold mb-4">NYC Navigation Assistant</h2>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about NYC venues, transit options, etc."
            className="flex-grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md disabled:opacity-50"
          >
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
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
          <span>Getting detailed directions from Llama AI...</span>
        </div>
      )}

      {response && (
        <div className="mt-4">
          {/* Add export controls */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              id="copy-button"
              onClick={handleCopyDirections}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-md flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy Text
            </button>

            <button
              onClick={handlePrintDirections}
              className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded-md flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>

            <button
              onClick={handleExportAsImage}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm px-3 py-1 rounded-md flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Save as Image
            </button>

            {!mapSvg && (
              <button
                onClick={handleGenerateMap}
                disabled={isGeneratingMap}
                className="bg-purple-500 hover:bg-purple-600 text-white text-sm px-3 py-1 rounded-md flex items-center disabled:opacity-50"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                {isGeneratingMap ? 'Generating...' : 'Generate Map'}
              </button>
            )}

            {mapSvg && (
              <button
                onClick={handleDownloadMap}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-3 py-1 rounded-md flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Map
              </button>
            )}
          </div>

          {/* Response content */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-4">Response:</h3>
            {/* Use custom article wrapper with text-left to ensure consistent alignment */}
            <div ref={responseRef}>
              <article className="prose prose-sm max-w-none text-left">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Text alignment fixes for headings
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-2xl font-bold mt-6 mb-3 text-left"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-xl font-bold mt-5 mb-3 text-blue-700 text-left"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-lg font-bold mt-4 mb-2 text-blue-600 text-left"
                        {...props}
                      />
                    ),
                    // Fix paragraphs to be consistently aligned
                    p: ({ node, ...props }) => (
                      <p className="mb-4 text-left" {...props} />
                    ),

                    // Fix list alignment issues
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc pl-6 mb-4 text-left"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal pl-6 mb-4 text-left"
                        {...props}
                      />
                    ),
                    // Fix list item alignment and spacing
                    li: ({ node, children, ...props }) => (
                      <li className="mb-1.5 text-left pl-0" {...props}>
                        <div className="ml-0">{children}</div>
                      </li>
                    ),
                    // Other formatting components
                    a: ({ node, ...props }) => (
                      <a className="text-blue-500 hover:underline" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-gray-300 pl-4 italic my-4 text-left"
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code
                          className="bg-gray-100 px-1 py-0.5 rounded"
                          {...props}
                        />
                      ) : (
                        <pre className="bg-gray-100 p-4 rounded overflow-x-auto my-4 text-left">
                          <code {...props} />
                        </pre>
                      ),
                    // Fix table alignment
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4">
                        <table
                          className="min-w-full border-collapse border border-gray-300 table-fixed"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-gray-100" {...props} />
                    ),
                    tbody: ({ node, ...props }) => (
                      <tbody className="divide-y divide-gray-300" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-gray-50" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="border border-gray-300 px-4 py-2 text-left font-semibold"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="border border-gray-300 px-4 py-2 text-left align-top"
                        {...props}
                      />
                    ),
                  }}
                >
                  {response}
                </ReactMarkdown>
              </article>
            </div>
          </div>

          {/* Map/Compass visualization */}
          {isGeneratingMap && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 text-purple-500 mr-2"
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
              <span>Generating route map...</span>
            </div>
          )}

          {mapSvg && (
            <div className="mt-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-4">Route Map/Compass:</h3>
                <div
                  ref={mapRef}
                  className="w-full max-w-2xl mx-auto bg-white p-4 rounded-md"
                  dangerouslySetInnerHTML={{ __html: mapSvg }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Example questions:</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-none pl-0">
          {[
            'What are 3 different ways to get from Penn Station to Madame X? Give me specific directions.',
            'I need to be at OS NYC by 8:00 PM. When should I leave from Penn Station?',
            "What's the most scenic route from Five Iron Golf to Beauty Bar?",
            'Compare subway vs walking from Penn Station to Barcade Chelsea.',
            'Create a detailed comparison table of all transportation options from Penn Station to OS NYC.',
          ].map((question, index) => (
            <li
              key={index}
              className="pl-0 cursor-pointer hover:underline"
              onClick={() => setQuery(question)}
            >
              • {question}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AIAssistant;
