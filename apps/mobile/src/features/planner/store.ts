// 일정 작성 중 화면 간에 유지해야 하는 입력 상태를 관리하는 Zustand store입니다.
import { create } from 'zustand';

import type { Place, SelectedPlace, TripCondition } from './types';

// PlannerState: 여행 조건과 선택 관광지, 상태 변경 함수를 묶은 store 타입입니다.
type PlannerState = {
  condition: TripCondition;
  selectedPlaces: SelectedPlace[];
  setTravelDate: (travelDate: string) => void;
  setStartTime: (startTime: string) => void;
  setEndTime: (endTime: string) => void;
  setDeparture: (departure: {
    name: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  addPlace: (place: Place) => void;
  removePlace: (placeId: string) => void;
  resetPlanner: () => void;
};

// initialCondition: 사용자가 아직 아무 조건도 입력하지 않은 기본 상태입니다.
const initialCondition: TripCondition = {
  travelDate: '',
  startTime: '',
  endTime: '',
  departureName: '',
};

// reorderPlaces: 관광지를 삭제한 뒤 방문 순서를 1번부터 다시 정리합니다.
function reorderPlaces(places: SelectedPlace[]): SelectedPlace[] {
  return places.map((place, index) => ({
    ...place,
    order: index + 1,
  }));
}

// usePlannerStore: 여행 조건 입력, 관광지 선택, 초기화를 화면에서 사용할 수 있게 합니다.
export const usePlannerStore = create<PlannerState>((set) => ({
  condition: initialCondition,
  selectedPlaces: [],
  setTravelDate: (travelDate) =>
    set((state) => ({
      condition: {
        ...state.condition,
        travelDate,
      },
    })),
  setStartTime: (startTime) =>
    set((state) => ({
      condition: {
        ...state.condition,
        startTime,
      },
    })),
  setEndTime: (endTime) =>
    set((state) => ({
      condition: {
        ...state.condition,
        endTime,
      },
    })),
  setDeparture: ({ name, latitude, longitude }) =>
    set((state) => ({
      condition: {
        ...state.condition,
        departureName: name,
        departureLatitude: latitude,
        departureLongitude: longitude,
      },
    })),
  addPlace: (place) =>
    set((state) => {
      // 이미 선택한 관광지는 중복으로 추가하지 않습니다.
      const alreadySelected = state.selectedPlaces.some(
        (selectedPlace) => selectedPlace.placeId === place.id,
      );

      if (alreadySelected) {
        return state;
      }

      // Place 데이터를 화면 상태에 필요한 SelectedPlace 형태로 바꿉니다.
      const selectedPlace: SelectedPlace = {
        placeId: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        stayMinutes: place.estimatedStayMinutes,
        order: state.selectedPlaces.length + 1,
      };

      return {
        selectedPlaces: [...state.selectedPlaces, selectedPlace],
      };
    }),
  removePlace: (placeId) =>
    set((state) => ({
      selectedPlaces: reorderPlaces(
        state.selectedPlaces.filter((place) => place.placeId !== placeId),
      ),
    })),
  resetPlanner: () => ({
    condition: initialCondition,
    selectedPlaces: [],
  }),
}));
