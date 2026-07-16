// 일정 진단 API가 연결되기 전까지 결과 화면에서 사용할 더미 진단 결과입니다.
import type { DiagnoseScheduleResult } from '@/features/planner/types';

// mockDiagnosis: 일정 가능 여부와 관광지별 도착/출발 시간을 보여주는 임시 결과입니다.
export const mockDiagnosis: DiagnoseScheduleResult = {
  diagnosisId: 'diagnosis-001',
  feasible: true,
  availableMinutes: 480,
  requiredMinutes: 390,
  remainingMinutes: 90,
  message: '입력한 시간 안에 방문할 수 있는 일정입니다.',
  schedule: [
    {
      placeId: 'place-haeundae-beach',
      placeName: '해운대해수욕장',
      order: 1,
      arrivalTime: '10:30',
      departureTime: '12:00',
      stayMinutes: 90,
      travelMinutesFromPrevious: 30,
    },
    {
      placeId: 'place-gwangalli-beach',
      placeName: '광안리해수욕장',
      order: 2,
      arrivalTime: '12:40',
      departureTime: '14:00',
      stayMinutes: 80,
      travelMinutesFromPrevious: 40,
    },
    {
      placeId: 'place-gamcheon-culture-village',
      placeName: '감천문화마을',
      order: 3,
      arrivalTime: '15:00',
      departureTime: '16:40',
      stayMinutes: 100,
      travelMinutesFromPrevious: 60,
    },
  ],
};
