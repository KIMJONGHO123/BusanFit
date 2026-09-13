import type { PlaceActivity } from './types';

export const placeActivities: PlaceActivity[] = [
  { id: 'cafe', name: '카페 이용', minutes: 40 },
  { id: 'meal', name: '식사', minutes: 60 },
  { id: 'shopping', name: '쇼핑', minutes: 50 },
  { id: 'photo', name: '사진 촬영', minutes: 20 },
  { id: 'walk', name: '산책', minutes: 30 },
  { id: 'viewing', name: '관람·전시', minutes: 60 },
  { id: 'experience', name: '체험 프로그램', minutes: 90 },
  { id: 'nightView', name: '전망·야경 감상', minutes: 30 },
  { id: 'rest', name: '휴식', minutes: 20 },
  { id: 'other', name: '기타 활동', minutes: 30 },
];

export const activityIcons: Record<PlaceActivity['id'], string> = {
  cafe: '☕',
  meal: '♨',
  shopping: '▣',
  photo: '▧',
  walk: '♟',
  viewing: '▤',
  experience: '◆',
  nightView: '☾',
  rest: '◷',
  other: '＋',
};

export function getActivityMinutes(activities: PlaceActivity[]): number {
  return activities.reduce((total, activity) => total + activity.minutes, 0);
}
