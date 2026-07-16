// 일정 진단 기능에서 공통으로 사용하는 TypeScript 타입을 모아둔 파일입니다.

// Place: 검색 결과나 더미 데이터로 보여줄 관광지 한 곳의 정보입니다.
export type Place = {
  id: string;
  name: string;
  address: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  estimatedStayMinutes: number;
};

// TripCondition: 사용자가 입력한 여행 날짜, 시간, 출발지 조건입니다.
export type TripCondition = {
  travelDate: string;
  startTime: string;
  endTime: string;
  departureName: string;
  departureLatitude?: number;
  departureLongitude?: number;
};

// SelectedPlace: 사용자가 일정에 포함하기로 선택한 관광지 정보입니다.
export type SelectedPlace = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  stayMinutes: number;
  order: number;
};

// ScheduleItem: 진단 결과에서 관광지별 방문 시간과 이동 시간을 나타냅니다.
export type ScheduleItem = {
  placeId: string;
  placeName: string;
  order: number;
  arrivalTime: string;
  departureTime: string;
  stayMinutes: number;
  travelMinutesFromPrevious: number;
};

// DiagnoseScheduleResult: 일정 진단 API가 나중에 반환할 결과 형태입니다.
export type DiagnoseScheduleResult = {
  diagnosisId: string;
  feasible: boolean;
  availableMinutes: number;
  requiredMinutes: number;
  remainingMinutes: number;
  message: string;
  schedule: ScheduleItem[];
};
