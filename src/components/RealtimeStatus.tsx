import React, { useState, useEffect } from 'react';
import { MTARealtimeService } from '../services/MTARealtimeService';
import SubwayBullet from './SubwayBullet';

interface RealtimeStatusProps {
  apiKey: string;
  lines: string[];
  feedType?: 'subway' | 'commuter';
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({
  apiKey,
  lines,
  feedType = 'subway',
}) => {
  const [statusData, setStatusData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        const mtaService = new MTARealtimeService(apiKey);

        // Fetch data for multiple lines
        const allStatuses = await Promise.all(
          lines.map((line) => mtaService.fetchRealtimeData(feedType, line))
        );

        // Flatten the results
        const flattenedStatuses = allStatuses.flat();
        setStatusData(flattenedStatuses);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching realtime data:', err);
        setError('Failed to fetch realtime transit data');
        setIsLoading(false);
      }
    };

    fetchRealtimeData();

    // Optional: Set up polling for real-time updates
    const intervalId = setInterval(fetchRealtimeData, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [apiKey, lines, feedType]);

  if (isLoading) return <div>Loading realtime transit status...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold mb-3">Realtime Transit Status</h2>
      {statusData.map((status, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-2 border-b ${
            status.status === 'Delayed'
              ? 'bg-yellow-50'
              : status.status === 'Cancelled'
              ? 'bg-red-50'
              : 'bg-green-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <SubwayBullet line={status.line} />
            <span className="font-medium">{status.line} Line</span>
          </div>
          <div className="text-right">
            <div
              className={`font-semibold ${
                status.status === 'Delayed'
                  ? 'text-yellow-700'
                  : status.status === 'Cancelled'
                  ? 'text-red-700'
                  : 'text-green-700'
              }`}
            >
              {status.status}
            </div>
            {status.estimatedArrival && (
              <div className="text-xs text-gray-600">
                Estimated: {status.estimatedArrival.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RealtimeStatus;
