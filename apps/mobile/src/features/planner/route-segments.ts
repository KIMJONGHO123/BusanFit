import { getCarRoute, getRouteErrorMessage, type RouteCoordinate } from '@/api/tmap';

import type { SelectedPlace, TripCondition } from './types';

export type RouteEndpoint = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
};

export type ScheduleRouteSegment = {
  id: string;
  order: number;
  from: RouteEndpoint;
  to: RouteEndpoint;
  totalTimeSeconds: number;
  totalTimeMinutes: number;
  totalDistanceMeters: number;
  coordinates: RouteCoordinate[];
  status: 'success' | 'failed';
  errorMessage?: string;
};

export function getOrderedPlaces(selectedPlaces: SelectedPlace[]): SelectedPlace[] {
  return [...selectedPlaces].sort((first, second) => first.order - second.order);
}

export function getDeparture(condition: TripCondition): RouteEndpoint | null {
  const latitude = condition.departureLatitude;
  const longitude = condition.departureLongitude;
  if (!condition.departureName.trim() || latitude === undefined || longitude === undefined ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { placeId: 'trip-departure', name: condition.departureName, latitude, longitude, order: 0 };
}

export function buildScheduleRouteLegs(selectedPlaces: SelectedPlace[], departure?: RouteEndpoint) {
  const orderedPlaces: RouteEndpoint[] = departure ? [departure, ...getOrderedPlaces(selectedPlaces)] : getOrderedPlaces(selectedPlaces);

  return orderedPlaces.slice(0, -1).map((from, index) => ({
    from,
    to: orderedPlaces[index + 1],
    order: index + 1,
  }));
}

export async function fetchScheduleRouteSegments(
  selectedPlaces: SelectedPlace[],
  departure?: RouteEndpoint,
): Promise<ScheduleRouteSegment[]> {
  const legs = buildScheduleRouteLegs(selectedPlaces, departure);

  return Promise.all(
    legs.map(async ({ from, to, order }) => {
      const baseSegment = {
        id: `${order}-${from.placeId}-${to.placeId}`,
        order,
        from,
        to,
      };

      try {
        const route = await getCarRoute({
          startLatitude: from.latitude,
          startLongitude: from.longitude,
          endLatitude: to.latitude,
          endLongitude: to.longitude,
        });

        if (!Number.isFinite(route.totalTimeSeconds) || route.totalTimeSeconds < 0 ||
          !Number.isFinite(route.totalDistanceMeters) || route.totalDistanceMeters < 0 || route.coordinates.length < 2 || route.coordinates.some((point) =>
          !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
          Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180
        )) {
          return {
            ...baseSegment,
            ...route,
            coordinates: [],
            status: 'failed' as const,
            errorMessage: '도로 경로 좌표가 없거나 올바르지 않습니다. 경로를 다시 조회해 주세요.',
          };
        }

        return {
          ...baseSegment,
          totalTimeSeconds: route.totalTimeSeconds,
          totalTimeMinutes: route.totalTimeMinutes,
          totalDistanceMeters: route.totalDistanceMeters,
          coordinates: route.coordinates,
          status: 'success' as const,
        };
      } catch (error) {
        return {
          ...baseSegment,
          totalTimeSeconds: 0,
          totalTimeMinutes: 0,
          totalDistanceMeters: 0,
          coordinates: [],
          status: 'failed' as const,
          errorMessage: getRouteErrorMessage(error),
        };
      }
    }),
  );
}

export function getRouteCoordinates(routeSegments: ScheduleRouteSegment[]): RouteCoordinate[] {
  return routeSegments.flatMap((segment) => segment.coordinates);
}
