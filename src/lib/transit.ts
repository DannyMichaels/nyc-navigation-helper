import { TransitOption } from '../types';

export const getColorForOption = (option: TransitOption): string => {
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

export const getIconForOption = (option: TransitOption): string => {
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
