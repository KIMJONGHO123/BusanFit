import { isAxiosError } from 'axios';

import { apiClient } from '@/api/client';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type CarRouteRequest = {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
};

export type CarRouteResponse = {
  totalTimeSeconds: number;
  totalTimeMinutes: number;
  totalDistanceMeters: number;
  coordinates: RouteCoordinate[];
};

export async function getCarRoute(request: CarRouteRequest): Promise<CarRouteResponse> {
  const response = await apiClient.post<CarRouteResponse>('/api/tmap/car-route', request);

  return {
    ...response.data,
    coordinates: response.data.coordinates ?? [],
  };
}

export function getRouteErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return '경로를 불러올 수 없습니다.';
  }

  const data: unknown = error.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (!error.response) {
    return '서버에 연결할 수 없습니다.';
  }

  return `경로 API 요청에 실패했습니다. (${error.response.status})`;
}
