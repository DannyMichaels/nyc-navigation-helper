import React from 'react';
import { getSubwayLineColor } from '../api/llamaApi';

// Helper component for rendering subway train symbols with correct MTA styling
const SubwayBullet: React.FC<{ line: string; color?: string }> = ({
  line,
  color,
}) => {
  // Default subway line colors if not provided

  const bgColor = color || getSubwayLineColor(line);
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
