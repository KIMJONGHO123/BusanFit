// 관광지 검색 API가 연결되기 전까지 화면에서 사용할 부산 관광지 더미 데이터입니다.
import type { Place } from '@/features/planner/types';

// mockPlaces: 관광지 검색 및 선택 화면에서 목록으로 표시됩니다.
export const mockPlaces: Place[] = [
  {
    id: 'place-haeundae-beach',
    name: '해운대해수욕장',
    address: '부산광역시 해운대구 우동',
    category: '해변',
    latitude: 35.1587,
    longitude: 129.1604,
    estimatedStayMinutes: 90,
  },
  {
    id: 'place-gwangalli-beach',
    name: '광안리해수욕장',
    address: '부산광역시 수영구 광안해변로 219',
    category: '해변',
    latitude: 35.1532,
    longitude: 129.1186,
    estimatedStayMinutes: 80,
  },
  {
    id: 'place-gamcheon-culture-village',
    name: '감천문화마을',
    address: '부산광역시 사하구 감내2로 203',
    category: '문화마을',
    latitude: 35.0975,
    longitude: 129.0106,
    estimatedStayMinutes: 100,
  },
];
