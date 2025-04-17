import React from 'react';

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
        width: '1.5rem',
        height: '1.5rem',
        fontSize: '0.875rem',
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {line}
    </div>
  );
};

export default SubwayBullet;
