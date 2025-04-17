import axios from 'axios';
import { TransitOption, Venue } from '../types';
import {
  formatTimeToTwelveHour,
  convertToEst,
  calculateOptimalDeparture,
} from '../lib/time';
import { MTARealtimeService } from '../services/MTARealtimeService';

const API_URL = 'http://localhost:11434/api/chat';

export const generateSvgWithLlama = async (
  venues: any[],
  center: any | null
) => {
  try {
    const prompt = `
  You are a specialized AI assistant that generates SVG code for displaying locations on an NYC map/compass.
  
  Here are the venues that need to be placed on the map:
  ${JSON.stringify(venues, null, 2)}
  
  ${
    center
      ? `The center/reference point of the map should be: ${JSON.stringify(
          center,
          null,
          2
        )}`
      : 'Use the first venue as the center point.'
  }
  
  Please generate valid SVG code for a compass/map visualization that:
  1. Shows all venues relative to their geographic positions with VERY HIGH ACCURACY based on the coordinates
  2. Has a clean, modern design with a circular compass rose and concentric distance rings
  3. Uses the provided colors for the venue markers
  4. Includes direction indicators (N/S/E/W)
  5. Shows major NYC avenues and streets as reference lines - specifically include 5th Ave, 6th Ave, 7th Ave, Broadway, etc.
  6. Represents distance accurately to scale based on the latitude/longitude values
  7. Includes a clear legend showing what each marker represents
  8. Places markers precisely based on the mathematical calculation from the coordinates
  
  The SVG should include:
  - A proper NYC grid overlay showing the main avenues and streets
  - Distance rings to indicate approximate walking times (5min, 10min, 15min)
  - Proper handling of the Manhattan grid's angle (approx. 29 degrees from true north)
  - Clear, readable labels for all markers and streets
  
  Return ONLY the raw SVG code with no explanation or markdown. The SVG should have viewBox="0 0 500 500" and no width/height attributes so it can be responsive.
  `;

    // Note: Updated to use llama3.2 instead of llama3
    const response = await axios.post(API_URL, {
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content:
            'You are a specialized AI that generates SVG code for map visualizations. You excel at creating accurate, mathematical representations of geographic data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    // Make sure the response is just the SVG code without any markdown
    let svg = response.data.message.content;

    // Remove any markdown code block indicators
    svg = svg
      .replace(/```svg/g, '')
      .replace(/```/g, '')
      .trim();

    // Make sure it starts with <svg
    if (!svg.startsWith('<svg')) {
      throw new Error('Invalid SVG generated');
    }

    return svg;
  } catch (error) {
    console.error('Error generating SVG:', error);
    // Return a fallback SVG if there's an error
    return generateFallbackSvg(venues, center);
  }
};

export const geocodeAddressWithLlama = async (
  address: string
): Promise<[number, number]> => {
  try {
    const prompt = `
I need to convert this New York City address to approximate latitude and longitude coordinates:
"${address}"

Please respond ONLY with a JSON object containing latitude and longitude, like this:
{"lat": 40.7128, "lng": -74.0060}

Do not include any explanation, just the JSON.
`;

    const response = await axios.post(API_URL, {
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content:
            'You are a specialized AI that converts addresses to coordinates.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    const content = response.data.message.content;

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[^}]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const coordinates = JSON.parse(jsonMatch[0]);
    return [coordinates.lat, coordinates.lng];
  } catch (error) {
    console.error('Error geocoding address:', error);
    // Return approximate coordinates for NYC
    return [40.7128, -74.006];
  }
};

export const getTransitSuggestionWithLlama = async (
  fromVenue: Venue,
  toVenue: Venue
): Promise<Partial<TransitOption>> => {
  try {
    const prompt = `
I need a transit suggestion from "${fromVenue.name}" (${fromVenue.address}) to "${toVenue.name}" (${toVenue.address}) in New York City.

Please respond ONLY with a JSON object containing:
1. type: "subway", "bus", or "walk"
2. description: A brief description of the route
3. duration: Estimated travel time in minutes
4. line: Subway or bus line(s) if applicable

Respond with JSON only, no explanation.
`;

    const response = await axios.post(API_URL, {
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content:
            'You are a specialized AI that provides NYC transit information.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    const content = response.data.message.content;

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[^}]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const transitInfo = JSON.parse(jsonMatch[0]);

    // Generate a color based on the transit type or line
    let color = '#333333';
    if (transitInfo.type === 'subway') {
      // NYC subway line colors
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
      };

      // Try to find a color for the line
      if (transitInfo.line) {
        const line = transitInfo.line.split(',')[0].trim();
        color = subwayColors[line] || '#333333';
      }
    } else if (transitInfo.type === 'walk') {
      color = '#4285F4';
    } else if (transitInfo.type === 'bus') {
      color = '#FF6D00';
    }

    return {
      ...transitInfo,
      from: fromVenue.id,
      to: toVenue.id,
      color,
    };
  } catch (error) {
    console.error('Error getting transit suggestion:', error);
    // Return a default suggestion
    return {
      type: 'walk',
      description: 'Walk to destination',
      duration: 20,
      from: fromVenue.id,
      to: toVenue.id,
      color: '#4285F4',
    };
  }
};

// Fallback SVG generator in case Llama API fails
const generateFallbackSvg = (venues: Venue[], center: any | null): string => {
  const centerVenue = center || venues[0];

  let svg = `
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <circle cx="250" cy="250" r="200" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
  <line x1="50" y1="250" x2="450" y2="250" stroke="#333" stroke-width="1"/>
  <line x1="250" y1="50" x2="250" y2="450" stroke="#333" stroke-width="1"/>
  <text x="250" y="30" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">NORTH</text>
  <text x="250" y="480" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">SOUTH</text>
  <text x="30" y="250" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">WEST</text>
  <text x="470" y="250" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">EAST</text>
`;

  // Add venue markers
  venues.forEach((venue) => {
    // Skip if it's the center venue
    if (venue.id === centerVenue.id) {
      // Add center marker
      svg += `
  <circle cx="250" cy="250" r="15" fill="${venue.color}" stroke="#333" stroke-width="2"/>
  <text x="250" y="255" text-anchor="middle" font-family="Arial" font-size="10" fill="white" font-weight="bold">${venue.shortName}</text>`;
      return;
    }

    // Calculate relative position
    const latDiff = venue.coordinates[0] - centerVenue.coordinates[0];
    const lngDiff = venue.coordinates[1] - centerVenue.coordinates[1];

    // Scale for NYC (longitude difference is compressed)
    const scale = 1000;
    const xPos = 250 + lngDiff * scale * 1.5;
    const yPos = 250 - latDiff * scale; // Negative because north is up

    // Add venue marker
    svg += `
  <circle cx="${xPos}" cy="${yPos}" r="10" fill="${
      venue.color
    }" stroke="#333" stroke-width="2"/>
  <text x="${xPos}" y="${
      yPos + 5
    }" text-anchor="middle" font-family="Arial" font-size="8" fill="white" font-weight="bold">${
      venue.shortName
    }</text>`;
  });

  // Close SVG
  svg += `
</svg>`;

  return svg;
};

export const getEnhancedTransitWithLlama = async (
  fromVenue: Venue,
  toVenue: Venue,
  arrivalTime?: string,
  currentTime: Date = new Date()
): Promise<TransitOption[]> => {
  try {
    // Calculate optimal departure and max travel time
    const { departureTime, maxTravelTime } = calculateOptimalDeparture(
      currentTime,
      arrivalTime
    );

    // Create a detailed prompt with specific routing requirements
    const prompt = `
You are an expert NYC transit router. Provide comprehensive transit options from "${
      fromVenue.name
    }" (${fromVenue.address}) to "${toVenue.name}" (${
      toVenue.address
    }) in the New York City metropolitan area.

CURRENT ROUTING CONTEXT:
- Current Time: ${departureTime.toLocaleTimeString()}
- Maximum Travel Time: ${maxTravelTime} minutes
- Desired Arrival Time: ${arrivalTime || 'Not specified'}

SPECIFIC ROUTING REQUIREMENTS:
1. Provide MULTIPLE route options focusing on:
   - Rockville Centre to Manhattan transit
   - Direct LIRR routes
   - LIRR + Subway combinations
   - Subway routes via Jamaica Station
   - Alternative transit methods

2. For EACH ROUTE, provide:
   - Exact train lines
   - Transfer points
   - Estimated travel time
   - Cost
   - Pros and cons

3. Prioritize routes that:
   - Arrive before desired time
   - Minimize total travel time
   - Consider rush hour dynamics
   - Provide best transfer efficiency

DETAILED ROUTE INFORMATION FORMAT:
{
  "type": "lirr" | "subway" | "multimodal",
  "name": "Route Description",
  "line": "Specific Train Lines",
  "direction": "Travel Direction",
  "description": "Detailed Step-by-Step Route",
  "duration": Minutes,
  "cost": Total Cost in USD,
  "pros": ["Advantage 1", "Advantage 2"],
  "cons": ["Disadvantage 1", "Disadvantage 2"]
}

FOCUS AREAS:
- Direct LIRR Babylon Line options
- Subway transfers at key stations
- Minimal walking
- Consider time of day (rush hour)

Respond with ONLY a valid JSON array of transit options.
`;

    const response = await axios.post(API_URL, {
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content: `You are a hyper-detailed NYC transit routing AI for Long Island to Manhattan routes. 
- Expert in Rockville Centre to Manhattan transit
- Precise about train lines, transfer points
- Considers real-time transit constraints
- Prioritizes efficiency and passenger convenience`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    const content = response.data.message.content;

    // Extract JSON array from the response
    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    // Initialize MTA Realtime Service
    const mtaService = new MTARealtimeService('');

    // Parse the JSON array
    try {
      const transitOptions = JSON.parse(jsonMatch[0]);

      // Process each option to enhance display and ensure types are correct
      const processedOptions = await Promise.all(
        transitOptions.map(
          async (option: Partial<TransitOption>, index: number) => {
            // Enhance route options with additional details
            switch (option.type) {
              case 'lirr':
                option.trainSymbol = 'L';
                option.trainColor = '#808183'; // Silver/Gray for LIRR
                option.color = '#808183';
                option.recommended = index === 0;

                // Fetch LIRR real-time status
                try {
                  const lirrStatuses = await mtaService.getRealtimeStatus(
                    'LIRR'
                  );
                  if (lirrStatuses.length > 0) {
                    const status = lirrStatuses[0];
                    option.realtimeStatus = status.status;
                    option.estimatedArrival = status.estimatedArrival;
                  }
                } catch (error) {
                  console.error('Error fetching LIRR realtime data:', error);
                }
                break;

              case 'subway':
                if (option.line) {
                  const lineSymbol = option.line.split(',')[0].trim();
                  option.trainSymbol = lineSymbol;
                  option.trainColor = getSubwayLineColor(lineSymbol);
                  option.color = option.trainColor;

                  // Fetch real-time status for subway lines
                  try {
                    const realtimeStatuses = await mtaService.getRealtimeStatus(
                      lineSymbol
                    );
                    if (realtimeStatuses.length > 0) {
                      const status = realtimeStatuses[0];
                      option.realtimeStatus = status.status;
                      option.estimatedArrival = status.estimatedArrival;
                    }
                  } catch (error) {
                    console.error(
                      `Error fetching realtime data for ${lineSymbol}:`,
                      error
                    );
                  }
                }
                break;

              case 'multimodal':
                option.trainSymbol = 'M';
                option.trainColor = '#4285F4';
                option.color = '#4285F4';
                break;

              case 'bus':
                option.trainSymbol = 'B';
                option.trainColor = '#FF6D00';
                option.color = '#FF6D00';
                break;
            }

            // Format times
            const formatTime = (time: string | Date) => {
              const timeObj =
                typeof time === 'string'
                  ? new Date(`1970-01-01T${time}`)
                  : time;
              return formatTimeToTwelveHour(
                timeObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              );
            };

            // Set departure and arrival times
            option.departureTime = formatTime(departureTime);
            if (option.duration) {
              const arrivalTime = new Date(departureTime);
              arrivalTime.setMinutes(
                arrivalTime.getMinutes() + option.duration
              );
              option.arrivalTime = formatTime(arrivalTime);
            }

            // Add unique ID and venue references
            option.id = `transit-${Date.now()}-${index}`;
            option.from = fromVenue.id;
            option.to = toVenue.id;

            // Ensure steps are added
            if (!option.steps) {
              option.steps = [
                'Detailed route steps not provided',
                'Please refer to the description for route information',
              ];
            }

            return option as TransitOption;
          }
        )
      );

      return processedOptions;
    } catch (err) {
      console.error('Error parsing JSON:', err);
      throw new Error('Failed to parse transit options JSON');
    }
  } catch (error) {
    console.error('Error getting enhanced transit options:', error);

    // Fallback detailed routes using current time context
    const { departureTime, maxTravelTime } = calculateOptimalDeparture(
      currentTime,
      arrivalTime
    );

    // Fetch real-time LIRR status as an example
    let lirrStatus: RealtimeTransitStatus[] = [];
    try {
      const mtaService = new MTARealtimeService('');
      lirrStatus = await mtaService.getRealtimeStatus('LIRR');
    } catch (statusError) {
      console.error('Error fetching LIRR status:', statusError);
    }

    return [
      {
        id: `transit-${Date.now()}-1`,
        type: 'lirr',
        name: 'Direct LIRR Express',
        line: 'LIRR Babylon Line',
        direction: 'Eastbound',
        trainSymbol: 'L',
        trainColor: '#808183',
        description: `Take the LIRR Babylon Line from Rockville Centre Station directly to Penn Station. From Penn Station, take the subway to Bowery.`,
        duration: 45,
        cost: 15.5,
        from: fromVenue.id,
        to: toVenue.id,
        pros: [
          'Direct LIRR route',
          'Minimal transfers',
          'Comfortable train service',
        ],
        cons: [
          'More expensive than subway',
          'Requires additional subway transfer',
        ],
        recommended: true,
        departureTime: formatTimeToTwelveHour(
          departureTime.toLocaleTimeString()
        ),
        arrivalTime: formatTimeToTwelveHour(
          new Date(departureTime.getTime() + 45 * 60000).toLocaleTimeString()
        ),
        color: '#808183',
        steps: [
          'Walk to Rockville Centre LIRR Station',
          'Take LIRR Babylon Line to Penn Station',
          'Transfer to subway at Penn Station',
          'Take subway to Bowery Station',
          'Short walk to final destination',
        ],
        realtimeStatus:
          lirrStatus.length > 0 ? lirrStatus[0].status : undefined,
        estimatedArrival:
          lirrStatus.length > 0 ? lirrStatus[0].estimatedArrival : undefined,
      },
      {
        id: `transit-${Date.now()}-2`,
        type: 'multimodal',
        name: 'Subway + Bus Combination',
        line: 'A,1,M15',
        direction: 'Downtown',
        trainSymbol: 'M',
        trainColor: '#4285F4',
        description: `Combination of subway and bus routes with minimal walking.`,
        duration: 55,
        cost: 8.75,
        from: fromVenue.id,
        to: toVenue.id,
        pros: ['Lower cost', 'Multiple route options', 'Flexible transfers'],
        cons: [
          'Longer travel time',
          'More complicated route',
          'Potential crowded transfers',
        ],
        recommended: false,
        departureTime: formatTimeToTwelveHour(
          departureTime.toLocaleTimeString()
        ),
        arrivalTime: formatTimeToTwelveHour(
          new Date(departureTime.getTime() + 55 * 60000).toLocaleTimeString()
        ),
        color: '#4285F4',
        steps: [
          'Take subway from Rockville Centre to Jamaica Station',
          'Transfer to E train to Manhattan',
          'Transfer to downtown 6 train',
          'Take M15 bus to final destination',
        ],
      },
    ];
  }
};

// Helper function for determining subway line colors
export const getSubwayLineColor = (lineSymbol: string) => {
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

  return subwayColors[lineSymbol?.trim?.()] || '#333333';
};
