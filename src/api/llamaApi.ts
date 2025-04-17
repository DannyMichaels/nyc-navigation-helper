import axios from 'axios';
import { Venue } from '../types';

const API_URL = 'http://localhost:11434/api/chat';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlamaRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
}

interface LlamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

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
const generateFallbackSvg = (venues: any[], center: any | null): string => {
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
  arrivalTime?: string
): Promise<TransitOption[]> => {
  try {
    // Create a detailed prompt that asks for multiple route options with specific train information
    const prompt = `
I need comprehensive transit options from "${fromVenue.name}" (${
      fromVenue.address
    }) to "${toVenue.name}" (${toVenue.address}) in New York City.

${arrivalTime ? `I need to arrive at ${toVenue.name} by ${arrivalTime}.` : ''}

Please provide 3-4 different route options, each as a separate JSON object in a JSON array. For each option, include:
1. "type": Primary transportation type ("subway", "bus", "walk", "taxi", "uber", etc.)
2. "name": A short descriptive name for this option (e.g., "Express Subway", "Scenic Walk")
3. "line": For subway, specify EXACTLY which train to take (e.g., "A" not "A, C, E")
4. "direction": For subway/bus, specify direction (e.g., "Downtown", "Uptown", "Brooklyn-bound")
5. "description": A detailed description with SPECIFIC trains to take. Do NOT list multiple trains like "A, C, E" - specify EXACTLY which one to take (e.g., "Take the Downtown A express train")
6. "duration": Estimated travel time in minutes
7. "cost": Estimated cost in USD (if applicable)
8. "pros": Array of advantages for this option
9. "cons": Array of disadvantages for this option
10. "recommended": Boolean indicating if this is the recommended option
${
  arrivalTime
    ? '11. "departureTime": Departure time in 12-hour format (e.g., "5:30 PM")\n12. "arrivalTime": Expected arrival time in 12-hour format (e.g., "6:15 PM")'
    : ''
}

For subway options:
- Clearly distinguish between local and express trains
- Include train color and symbol information (e.g., "Blue A circle", "Red 1 circle")
- Specify which specific entrance to use at stations when relevant
- Include which specific exit to use when arriving at a station
- If a transfer is needed, provide detailed instructions for the transfer

IMPORTANT: Always format times in 12-hour AM/PM format (e.g., "5:30 PM", "8:45 AM"), never in 24-hour format.

Respond with ONLY a valid JSON array of these objects, no explanation.
`;

    const response = await axios.post(API_URL, {
      model: 'llama3.2',
      messages: [
        {
          role: 'system',
          content:
            "You are a specialized AI that provides detailed NYC transit information with multiple routing options. You know the NYC subway system extremely well, including which trains are express vs local, the exact train colors and symbols, and typical transit times. You always specify EXACTLY which train to take (e.g., 'Take the Downtown A express train with the blue circle symbol' not just 'Take the A, C, E'). You always format times in 12-hour AM/PM format, never in 24-hour format. You provide specific, accurate information that would help even a tourist navigate NYC efficiently.",
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

    // Parse the JSON array
    try {
      const transitOptions = JSON.parse(jsonMatch[0]);

      // Process each option to enhance display and ensure types are correct
      return transitOptions.map((option: Partial<TransitOption>) => {
        // Extract exact train information if available
        if (
          option.type === 'subway' &&
          option.line &&
          !option.trainSymbol &&
          typeof option.line === 'string'
        ) {
          // Extract first letter/number for the icon
          option.trainSymbol = option.line.split(',')[0].trim();

          // Add color information based on NYC subway system
          option.trainColor = getSubwayLineColor(option.trainSymbol);
        }

        // Format time if not already in 12-hour format
        if (
          option.departureTime &&
          !option.departureTime.includes('AM') &&
          !option.departureTime.includes('PM')
        ) {
          option.departureTime = formatTimeToTwelveHour(option.departureTime);
        }

        if (
          option.arrivalTime &&
          !option.arrivalTime.includes('AM') &&
          !option.arrivalTime.includes('PM')
        ) {
          option.arrivalTime = formatTimeToTwelveHour(option.arrivalTime);
        }

        // Ensure the option has an ID
        if (!option.id) {
          option.id = `transit-${Date.now()}-${Math.floor(
            Math.random() * 1000
          )}`;
        }

        // Set from and to fields if they're not already set
        if (!option.from) option.from = fromVenue.id;
        if (!option.to) option.to = toVenue.id;

        return option as TransitOption;
      });
    } catch (err) {
      console.error('Error parsing JSON:', err);
      throw new Error('Failed to parse transit options JSON');
    }
  } catch (error) {
    console.error('Error getting enhanced transit options:', error);
    // Return a default set of options with more specific train information
    return [
      {
        id: `transit-${Date.now()}-1`,
        type: 'subway',
        name: 'Express Subway',
        line: '1',
        direction: 'Downtown',
        trainSymbol: '1',
        trainColor: '#EE352E',
        description: `Take the Downtown 1 local train (red circle) from Penn Station to Chambers St. Exit at the north end of the station and walk east on Chambers St to ${toVenue.name}.`,
        duration: 20,
        cost: 2.75,
        from: fromVenue.id,
        to: toVenue.id,
        pros: ['Fast', 'Reliable service', 'Frequent trains'],
        cons: ['Can be crowded during rush hour'],
        recommended: true,
        departureTime: '5:30 PM',
        arrivalTime: '5:50 PM',
        color: '#EE352E',
      },
      {
        id: `transit-${Date.now()}-2`,
        type: 'walk',
        name: 'Scenic Walking Route',
        description: `Walk east from ${fromVenue.name} via 34th Street, then south on 5th Avenue all the way to ${toVenue.name}.`,
        duration: 40,
        from: fromVenue.id,
        to: toVenue.id,
        pros: ['Exercise', 'No cost', 'See city landmarks'],
        cons: ['Weather dependent', 'Longer travel time'],
        recommended: false,
        departureTime: '5:00 PM',
        arrivalTime: '5:40 PM',
        color: '#4285F4',
      },
    ];
  }
};

// Helper function for determining subway line colors
export const getSubwayLineColor = (lineSymbol: string) => {
  // NYC subway line colors
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

  return subwayColors[lineSymbol] || '#333333';
};
