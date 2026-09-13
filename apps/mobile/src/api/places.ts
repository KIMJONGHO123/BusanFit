import { apiClient } from './client';

import type { Place } from '@/features/planner/types';

export async function searchPlaces(keyword: string): Promise<Place[]> {
  const response = await apiClient.get<Place[]>('/api/places/search', {
    params: {
      keyword,
      page: 1,
      size: 20,
    },
  });

  return response.data;
}
