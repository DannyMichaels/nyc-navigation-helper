import axios from 'axios';
import * as gtfs from 'gtfs-realtime-bindings';

// Comprehensive MTA Realtime Feed URLs
const MTA_FEED_URLS = {
  subway: {
    ACE: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    BDFM: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
    NQRW: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    G: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
    L: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
    JZ: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
    '123': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
  },
  commuter: {
    LIRR: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr',
    MetroNorth:
      'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr',
  },
};

// Mapping of subway line groups
const LINE_GROUPS: Record<string, string[]> = {
  ACE: ['A', 'C', 'E'],
  BDFM: ['B', 'D', 'F', 'M'],
  NQRW: ['N', 'Q', 'R', 'W'],
  JZ: ['J', 'Z'],
  '123': ['1', '2', '3'],
};

export interface RealtimeTransitStatus {
  line: string;
  type: 'subway' | 'lirr' | 'metro-north';
  status: 'OnTime' | 'Delayed' | 'Cancelled';
  estimatedArrival?: Date;
  scheduledArrival?: Date;
  platform?: string;
  destination?: string;
  originStation?: string;
}

export class MTARealtimeService {
  // Find the correct feed for a given line or transit type
  private static findFeedForLine(
    line: string
  ): { url: string; type: 'subway' | 'lirr' | 'metro-north' } | null {
    // Check subway lines first
    for (const [feedKey, lines] of Object.entries(LINE_GROUPS)) {
      if (lines.includes(line)) {
        return {
          url: MTA_FEED_URLS.subway[
            feedKey as keyof typeof MTA_FEED_URLS.subway
          ],
          type: 'subway',
        };
      }
    }

    // Check LIRR and Metro-North
    switch (line.toUpperCase()) {
      case 'LIRR':
        return {
          url: MTA_FEED_URLS.commuter.LIRR,
          type: 'lirr',
        };
      case 'METRO-NORTH':
        return {
          url: MTA_FEED_URLS.commuter.MetroNorth,
          type: 'metro-north',
        };
    }

    return null;
  }

  // Fetch real-time status for a specific line
  async getRealtimeStatus(line: string): Promise<RealtimeTransitStatus[]> {
    // Find the correct feed URL for the line
    const feedInfo = MTARealtimeService.findFeedForLine(line);
    if (!feedInfo) {
      console.warn(`No feed found for line: ${line}`);
      return [];
    }

    try {
      // Fetch the feed
      const response = await axios.get(feedInfo.url, {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/x-protobuf',
          Accept: 'application/x-protobuf',
        },
      });

      // Decode the protobuf message
      const feed = gtfs.transit_realtime.FeedMessage.decode(
        new Uint8Array(response.data)
      );

      // Process and filter the feed for the specific line
      return this.processRealtimeFeed(feed, line, feedInfo.type);
    } catch (error) {
      console.error(`Error fetching realtime data for line ${line}:`, error);
      return [];
    }
  }

  // Process the feed and extract relevant information
  private processRealtimeFeed(
    feed: gtfs.transit_realtime.FeedMessage,
    targetLine: string,
    feedType: 'subway' | 'lirr' | 'metro-north'
  ): RealtimeTransitStatus[] {
    const statuses: RealtimeTransitStatus[] = [];

    feed.entity.forEach((entity) => {
      // Focus on trip updates
      if (entity.tripUpdate) {
        const tripUpdate = entity.tripUpdate;
        const trip = tripUpdate.trip;

        // Determine if this trip matches our target line
        const matchesLine =
          feedType === 'subway' ? trip.routeId === targetLine : true; // For LIRR and Metro-North, include all trips

        if (matchesLine) {
          const stopTimeUpdates = tripUpdate.stopTimeUpdate;

          stopTimeUpdates?.forEach((stopUpdate) => {
            // Determine status
            const status = this.determineStatus(tripUpdate);

            statuses.push({
              line: trip.routeId || targetLine,
              type: feedType,
              status,
              estimatedArrival: stopUpdate.departure?.time
                ? new Date(Number(stopUpdate.departure.time) * 1000)
                : undefined,
              scheduledArrival: stopUpdate.departureTime
                ? new Date(Number(stopUpdate.departureTime) * 1000)
                : undefined,
              platform: stopUpdate.stopId,
              destination: trip.destinationStation,
              originStation: trip.startStation,
            });
          });
        }
      }
    });

    return statuses;
  }

  // Determine the service status
  private determineStatus(
    tripUpdate: gtfs.transit_realtime.ITripUpdate
  ): 'OnTime' | 'Delayed' | 'Cancelled' {
    // Check for cancellation
    if (
      tripUpdate.trip?.scheduleRelationship ===
      gtfs.transit_realtime.TripDescriptor.ScheduleRelationship.CANCELED
    ) {
      return 'Cancelled';
    }

    // Check for delays
    const stopTimeUpdates = tripUpdate.stopTimeUpdate;
    if (stopTimeUpdates && stopTimeUpdates.length > 0) {
      const firstUpdate = stopTimeUpdates[0];
      const scheduledTime = firstUpdate.departureTime;
      const estimatedTime = firstUpdate.departure?.time;

      if (scheduledTime && estimatedTime) {
        const delay = Number(estimatedTime) - Number(scheduledTime);
        // More than 5 minutes is considered delayed
        return delay > 300 ? 'Delayed' : 'OnTime';
      }
    }

    return 'OnTime';
  }

  // Get available transit lines
  getAvailableLines(): {
    subway: string[];
    lirr: string[];
    metroNorth: string[];
  } {
    return {
      subway: Object.values(LINE_GROUPS).flat(),
      lirr: ['LIRR'],
      metroNorth: ['METRO-NORTH'],
    };
  }

  // Get feed URLs (for reference)
  getFeedUrls() {
    return MTA_FEED_URLS;
  }
}

export default MTARealtimeService;
