import { getActivityMinutes } from './activities';
import type { ScheduleRouteSegment } from './route-segments';
import type { DiagnoseScheduleResult, SelectedPlace, TripCondition } from './types';

export function formatDuration(minutes: number): string {
  const seconds = Math.round(Math.abs(minutes) * 60);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds % 3600 / 60);
  const secs = seconds % 60;
  return [hours ? hours + '시간' : '', mins ? mins + '분' : '', secs ? secs + '초' : ''].filter(Boolean).join(' ') || '0분';
}

function timeSeconds(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('시간을 HH:mm 형식으로 입력해 주세요.');
  const [h, m] = value.split(':').map(Number);
  return h * 3600 + m * 60;
}
function formatTime(seconds: number): string {
  const day = Math.floor(seconds / 86400);
  const local = seconds % 86400;
  const h = String(Math.floor(local / 3600)).padStart(2, '0');
  const m = String(Math.floor(local % 3600 / 60)).padStart(2, '0');
  const s = local % 60;
  return (day ? '다음 날 ' : '') + h + ':' + m + (s ? ':' + String(s).padStart(2, '0') : '');
}

export function diagnoseSchedule(condition: TripCondition, selectedPlaces: SelectedPlace[], segments: ScheduleRouteSegment[]): DiagnoseScheduleResult {
  const start = timeSeconds(condition.startTime);
  const end = timeSeconds(condition.endTime);
  if (end <= start) throw new Error('종료 시간은 시작 시간보다 늦어야 합니다.');
  const places = [...selectedPlaces].sort((a, b) => a.order - b.order);
  if (!places.length) throw new Error('관광지를 한 곳 이상 선택해 주세요.');
  if (segments.length !== places.length) throw new Error('출발지부터 모든 구간의 경로가 필요합니다.');
  let cursor = start;
  const schedule = places.map((place, index) => {
    const segment = segments[index];
    const previousId = index === 0 ? 'trip-departure' : places[index - 1].placeId;
    if (segment.status !== 'success' || segment.from.placeId !== previousId || segment.to.placeId !== place.placeId || !Number.isFinite(segment.totalTimeSeconds) || segment.totalTimeSeconds < 0) {
      throw new Error('이동 경로를 확인하지 못했습니다. 경로를 다시 조회해 주세요.');
    }
    const activityMinutes = getActivityMinutes(place.activities);
    const stayMinutes = place.stayMinutes + activityMinutes;
    if (!Number.isFinite(stayMinutes) || stayMinutes < 0) throw new Error('체류시간을 확인해 주세요.');
    cursor += segment.totalTimeSeconds;
    const arrivalTime = formatTime(cursor);
    cursor += stayMinutes * 60;
    return { placeId: place.placeId, placeName: place.name, order: place.order, arrivalTime,
      departureTime: formatTime(cursor), stayMinutes, activities: place.activities, activityMinutes,
      travelMinutesFromPrevious: segment.totalTimeSeconds / 60 };
  });
  const remainingMinutes = (end - cursor) / 60;
  return { diagnosisId: 'tmap-schedule', feasible: remainingMinutes >= 0, availableMinutes: (end - start) / 60,
    requiredMinutes: (cursor - start) / 60, remainingMinutes,
    message: remainingMinutes >= 0 ? '자동차 이동시간과 선택한 활동의 체류시간을 합산하면 종료 시간 안에 마칠 수 있습니다.' : '자동차 이동시간과 체류시간을 합산하면 종료 시간을 초과합니다. 장소나 활동을 조정해 주세요.', schedule };
}
