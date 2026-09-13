import { useQuery } from '@tanstack/react-query';
import { fetchScheduleRouteSegments, getDeparture, getOrderedPlaces } from './route-segments';
import type { SelectedPlace, TripCondition } from './types';

export function useScheduleRoutes(condition: TripCondition, places: SelectedPlace[]) {
  const departure = getDeparture(condition);
  const ordered = getOrderedPlaces(places);
  const query = useQuery({
    queryKey: ['schedule-routes', condition.travelDate, condition.startTime, departure,
      ordered.map(({ placeId, latitude, longitude, order, name }) => ({ placeId, latitude, longitude, order, name }))],
    queryFn: () => fetchScheduleRouteSegments(ordered, departure!),
    enabled: Boolean(departure) && places.length > 0,
    // Keep the same route snapshot when switching between diagnosis and map.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  return { ...query, departure };
}
