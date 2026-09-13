import { Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { TmapView } from '@/components/TmapView';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/layout/BottomNavigation';
import {
  getOrderedPlaces,
  type ScheduleRouteSegment,
} from '@/features/planner/route-segments';
import { usePlannerStore } from '@/features/planner/store';
import type { SelectedPlace } from '@/features/planner/types';
import { formatDuration } from '@/features/planner/diagnose';
import { useScheduleRoutes } from '@/features/planner/use-schedule-routes';

const plannerConditionRoute = '/planner/condition' as Href;


const placeNames: Record<string, string> = {
  'place-haeundae-beach': '해운대 해수욕장',
  'place-gwangalli-beach': '광안리 해수욕장',
  'place-gamcheon-culture-village': '감천문화마을',
};

const savedTrips = [
  { title: '부산 3일 여행', date: '2024.05.20 - 05.22', selected: true },
  { title: '서울 주말 나들이', date: '2024.06.01 - 06.02', selected: false },
  { title: '제주도 여름 휴가', date: '2024.07.15 - 07.20', selected: false },
  { title: '경주 역사 탐방', date: '2024.08.10 - 08.12', selected: false },
];

export default function PlannerMapPage() {
  const [isSavedTripsVisible, setIsSavedTripsVisible] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [summaryHeight, setSummaryHeight] = useState(270);

  const condition = usePlannerStore((state) => state.condition);
  const selectedPlaces = usePlannerStore((state) => state.selectedPlaces);
  const orderedPlaces = useMemo(() => getOrderedPlaces(selectedPlaces), [selectedPlaces]);
  const routeSegmentsQuery = useScheduleRoutes(condition, selectedPlaces);
  const departure = routeSegmentsQuery.departure;

  const routeSegments = useMemo(() => routeSegmentsQuery.data ?? [], [routeSegmentsQuery.data]);
  const successfulSegments = routeSegments.filter((segment) => segment.status === 'success');
  const failedSegments = routeSegments.filter((segment) => segment.status === 'failed');
  const totalDistanceMeters = successfulSegments.reduce(
    (total, segment) => total + segment.totalDistanceMeters,
    0,
  );
  const totalTimeSeconds = successfulSegments.reduce(
    (total, segment) => total + segment.totalTimeSeconds,
    0,
  );

  const mapData = useMemo(() => ({
    places: (departure ? [departure, ...orderedPlaces] : orderedPlaces).map((place) => ({
      latitude: place.latitude, longitude: place.longitude,
      name: getPlaceName(place), order: place.order,
    })),
    segments: routeSegments.filter((segment) => segment.status === 'success')
      .map((segment) => ({ coordinates: segment.coordinates, order: segment.order })),
  }), [departure, orderedPlaces, routeSegments]);

  const openSavedTrips = () => setIsSavedTripsVisible(true);
  const closeSavedTrips = () => setIsSavedTripsVisible(false);
  const focusCurrentSchedule = () => setFocusRequest((value) => value + 1);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 bg-slate-100">
        <View style={{ position: 'absolute', top: 126, left: 0, right: 0, bottom: summaryHeight + 108 }}>
          <TmapView data={mapData} focusRequest={focusRequest} />
        </View>

        <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 z-20 px-5 pt-4">
          <View pointerEvents="auto" className="h-14 flex-row items-center rounded-sm bg-white px-4 shadow">
            <Pressable accessibilityRole="button" className="mr-3 h-10 w-8 justify-center" onPress={() => router.back()}>
              <Text className="text-2xl text-slate-700">‹</Text>
            </Pressable>
            <Text className="flex-1 text-sm font-semibold text-slate-500">
              {orderedPlaces.length > 0 ? `${orderedPlaces.length}개 관광지 경로` : '선택된 관광지 없음'}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center"
              onPress={openSavedTrips}>
              <Text className="text-xl font-black text-slate-700">≡</Text>
            </Pressable>
          </View>

          <View pointerEvents="auto" className="mt-3 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-busan-blue px-4 py-2 shadow-sm">
              <Text className="text-xs font-black text-white">자동차</Text>
            </View>
            <View className="rounded-full bg-white px-4 py-2 shadow-sm">
              <Text className="text-xs font-black text-slate-800">TMAP 지도 · 경로</Text>
            </View>
            {failedSegments.length > 0 ? (
              <View className="rounded-full bg-red-500 px-4 py-2 shadow-sm">
                <Text className="text-xs font-black text-white">일부 실패</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          className="absolute right-5 top-[34%] z-10 h-12 w-12 items-center justify-center rounded-md bg-white shadow"
          onPress={focusCurrentSchedule}>
          <Text className="text-xl text-black">◎</Text>
        </Pressable>

        <RouteSummaryPanel
          departureMissing={!departure}
          onHeightChange={setSummaryHeight}
          onRetryRoutes={() => void routeSegmentsQuery.refetch()}
          conditionDeparture={condition.departureName}
          failedSegments={failedSegments}
          isFetching={routeSegmentsQuery.isFetching}
          orderedPlaces={orderedPlaces}
          routeSegments={routeSegments}
          successfulSegments={successfulSegments}
          totalDistanceMeters={totalDistanceMeters}
          totalTimeSeconds={totalTimeSeconds}
        />

        {isSavedTripsVisible ? <SavedTripsSheet onClose={closeSavedTrips} /> : null}

        <BottomNavigation />
      </View>
    </SafeAreaView>
  );
}

function RouteSummaryPanel({
  departureMissing,
  onHeightChange,
  onRetryRoutes,
  conditionDeparture,
  failedSegments,
  isFetching,
  orderedPlaces,
  routeSegments,
  successfulSegments,
  totalDistanceMeters,
  totalTimeSeconds,
}: {
  departureMissing: boolean;
  onHeightChange: (height: number) => void;
  onRetryRoutes: () => void;
  conditionDeparture: string;
  failedSegments: ScheduleRouteSegment[];
  isFetching: boolean;
  orderedPlaces: SelectedPlace[];
  routeSegments: ScheduleRouteSegment[];
  successfulSegments: ScheduleRouteSegment[];
  totalDistanceMeters: number;
  totalTimeSeconds: number;
}) {
  const title =
    orderedPlaces.length > 1
      ? `${conditionDeparture} → ${getPlaceName(orderedPlaces.at(-1) ?? orderedPlaces[0])}`
      : orderedPlaces[0]
        ? conditionDeparture + ' → ' + getPlaceName(orderedPlaces[0])
        : '일정 경로';

  return (
    <View onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)} className="absolute bottom-[92px] left-5 right-5 z-20 rounded-lg bg-white p-4 shadow-lg">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-black uppercase text-busan-blue">Route Overview</Text>
          <Text className="mt-1 text-lg font-black text-black" numberOfLines={1}>
            {title}
          </Text>
          <Text className="mt-1 text-xs font-bold text-slate-500">
            출발: {conditionDeparture.trim() || '입력된 출발지 없음'}
          </Text>
        </View>
        {isFetching ? <ActivityIndicator color="#208AEF" /> : null}
      </View>

      <Text className="mt-3 text-xs font-bold text-slate-600">{departureMissing ? '출발 위치를 선택하면 첫 관광지까지의 경로를 포함해 조회합니다.' : getRouteStatusText(orderedPlaces.length, isFetching, routeSegments, failedSegments)}</Text>

      {departureMissing ? <Pressable accessibilityRole="button" className="mt-2 py-2" onPress={() => router.push(plannerConditionRoute)}><Text className="text-xs font-bold text-busan-blue">출발 위치 선택하기</Text></Pressable> : null}
      {failedSegments.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={onRetryRoutes} disabled={isFetching} className="mt-2 py-2">
          <Text className="text-xs font-bold text-busan-blue">경로 다시 조회하기</Text>
        </Pressable>
      ) : null}

      {successfulSegments.length > 0 ? (
        <View className="mt-4 flex-row rounded-md bg-blue-50">
          <View className="flex-1 items-center py-3">
            <Text className="text-[10px] font-bold text-slate-500">총 이동거리</Text>
            <Text className="mt-1 text-base font-black text-busan-blue">
              {formatDistance(totalDistanceMeters)}
            </Text>
          </View>
          <View className="w-[1px] bg-white" />
          <View className="flex-1 items-center py-3">
            <Text className="text-[10px] font-bold text-slate-500">총 이동시간</Text>
            <Text className="mt-1 text-base font-black text-busan-blue">
              {formatSeconds(totalTimeSeconds)}
            </Text>
          </View>
        </View>
      ) : null}

      {routeSegments.length > 0 ? (
        <ScrollView className="mt-3" style={{ maxHeight: 116 }}>
          {routeSegments.map((segment) => (
            <View key={segment.id} className="mb-2 rounded-md bg-slate-50 px-3 py-2">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-xs font-black text-slate-800" numberOfLines={1}>
                  {segment.order}. {getPlaceName(segment.from)} → {getPlaceName(segment.to)}
                </Text>
                <Text
                  className={`ml-2 text-[11px] font-black ${
                    segment.status === 'success' ? 'text-busan-blue' : 'text-red-500'
                  }`}>
                  {segment.status === 'success'
                    ? `${formatDistance(segment.totalDistanceMeters)} · ${formatSeconds(segment.totalTimeSeconds)}`
                    : '조회 실패'}
                </Text>
              </View>
              {segment.status === 'failed' ? (
                <Text className="mt-1 text-[11px] font-semibold text-red-500" numberOfLines={2}>
                  {segment.errorMessage}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Pressable
          accessibilityRole="button"
          className="mt-4 h-11 items-center justify-center rounded-md border border-dashed border-blue-200 bg-blue-50"
          onPress={() => router.push(plannerConditionRoute)}>
          <Text className="text-sm font-black text-busan-blue">관광지 선택하기</Text>
        </Pressable>
      )}
    </View>
  );
}

function SavedTripsSheet({ onClose }: { onClose: () => void }) {
  const resetPlanner = usePlannerStore((state) => state.resetPlanner);
  const handleCreateNewTrip = () => {
    resetPlanner();
    router.replace(plannerConditionRoute);
  };

  return (
    <View className="absolute inset-0 z-40 bg-white">
      <View className="h-14 flex-row items-center bg-white px-4 shadow-sm">
        <Pressable accessibilityRole="button" className="h-10 w-10 justify-center" onPress={onClose}>
          <Text className="text-2xl text-busan-blue">‹</Text>
        </Pressable>
        <Text className="flex-1 text-center text-base font-black text-busan-blue">Saved Trips</Text>
        <Text className="w-10 text-right text-2xl font-black text-busan-blue">⋮</Text>
      </View>

      <View className="flex-1 bg-white px-5 pt-3">
        <View className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
        <Text className="mt-4 text-center text-lg font-black text-black">저장된 일정</Text>

        <View className="mt-5">
          {savedTrips.map((trip) => (
            <Pressable
              key={trip.title}
              accessibilityRole="button"
              className={`mb-3 flex-row items-center px-4 py-3 ${
                trip.selected ? 'border-l-4 border-busan-blue bg-slate-100' : 'bg-white'
              }`}
              onPress={onClose}>
              <View className="flex-1">
                <Text className="text-sm font-black text-black">{trip.title}</Text>
                <Text className="mt-1 text-[10px] font-semibold text-slate-500">{trip.date}</Text>
              </View>
              {trip.selected ? (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-busan-blue">
                  <Text className="text-xs font-black text-white">✓</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          className="mt-2 h-12 flex-row items-center justify-center border border-dashed border-slate-200"
          onPress={handleCreateNewTrip}>
          <Text className="mr-2 text-lg font-black text-busan-blue">＋</Text>
          <Text className="text-sm font-black text-busan-blue">새 일정 생성하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getRouteStatusText(
  placeCount: number,
  isFetching: boolean,
  routeSegments: ScheduleRouteSegment[],
  failedSegments: ScheduleRouteSegment[],
) {
  if (placeCount < 1) {
    return '관광지를 1곳 이상 선택하면 실제 도로 경로를 조회합니다.';
  }
  if (isFetching) {
    return 'TMAP 자동차 경로를 조회하는 중입니다.';
  }
  if (failedSegments.length > 0) {
    return `${failedSegments.length}개 구간을 불러오지 못했습니다. 조회에 성공한 구간만 연결합니다.`;
  }
  if (routeSegments.length > 0) {
    return `${routeSegments.length}개 구간의 실제 도로 경로를 조회했습니다.`;
  }

  return '경로 정보가 아직 없습니다.';
}

function getPlaceName(place: Pick<SelectedPlace, 'placeId' | 'name'>) {
  return placeNames[place.placeId] ?? place.name;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }

  return `${distanceMeters}m`;
}

function formatSeconds(seconds: number) {
  return formatDuration(seconds / 60);
}
