import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { diagnoseSchedule, formatDuration } from '@/features/planner/diagnose';
import { usePlannerStore } from '@/features/planner/store';
import { useScheduleRoutes } from '@/features/planner/use-schedule-routes';

export default function PlannerResultPage() {
  const condition = usePlannerStore((state) => state.condition);
  const selectedPlaces = usePlannerStore((state) => state.selectedPlaces);
  const routes = useScheduleRoutes(condition, selectedPlaces);
  const result = useMemo(() => {
    if (!routes.departure) return { error: '여행 조건에서 출발 위치를 선택해 주세요.' };
    if (!selectedPlaces.length) return { error: '관광지를 한 곳 이상 선택해 주세요.' };
    if (!routes.data) return { error: routes.isError ? '경로를 불러오지 못했습니다.' : null };
    try { return { diagnosis: diagnoseSchedule(condition, selectedPlaces, routes.data) }; }
    catch (error) { return { error: error instanceof Error ? error.message : '진단할 수 없습니다.' }; }
  }, [condition, selectedPlaces, routes.data, routes.isError, routes.departure]);
  const diagnosis = routes.isFetching ? undefined : result.diagnosis;
  const lastStop = diagnosis?.schedule.at(-1);
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 px-6">
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text className="text-3xl text-busan-ink">‹</Text></Pressable>
        <Text className="text-lg font-black text-black">일정 진단</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/planner/condition')}><Text className="font-bold text-busan-blue">조건 수정</Text></Pressable>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-52 pt-7">
        <View className="rounded-xl bg-blue-50 p-5">
          <Text className="text-sm font-bold text-slate-600">{condition.travelDate} · 자동차</Text>
          <Text className="mt-2 text-2xl font-black text-busan-blue">{condition.startTime} – {condition.endTime}</Text>
          <Text className="mt-2 text-xs text-slate-500">TMAP 조회 시점의 예상 이동시간 기준입니다.</Text>
        </View>
        <View className="mt-6 border-l-4 border-busan-blue bg-white p-5">
          <Text className="text-xs font-black text-busan-blue">출발지</Text>
          <Text className="mt-2 text-xl font-black text-black">{condition.departureName || '출발지 미선택'}</Text>
          <Text className="mt-2 text-sm font-bold text-slate-600">{condition.startTime} 출발</Text>
        </View>
        {routes.isFetching ? <View className="mt-6 items-center gap-3 p-5"><ActivityIndicator color="#1677ff" /><Text>출발지부터 자동차 경로를 조회하고 있습니다.</Text></View> : null}
        {!diagnosis && !routes.isFetching ? <View className="mt-6 rounded-lg bg-red-50 p-5">
          <Text className="font-bold text-red-700">{result.error || '진단을 준비하고 있습니다.'}</Text>
          {routes.departure && selectedPlaces.length ? <Pressable accessibilityRole="button" onPress={() => void routes.refetch()} className="mt-3 py-2"><Text className="font-bold text-busan-blue">경로 다시 조회하기</Text></Pressable> : null}
        </View> : null}
        {diagnosis ? <>
          <View className="mt-3">
            {diagnosis.schedule.map((item, index) => <View key={item.placeId}>
              <Text className="my-4 text-sm font-semibold text-slate-600">↓ {index === 0 ? condition.departureName : diagnosis.schedule[index - 1].placeName} → {item.placeName} · 이동 {formatDuration(item.travelMinutesFromPrevious)}</Text>
              <View className="rounded-xl border border-slate-200 bg-white p-5">
                <Text className="text-base font-black text-black">{item.order}. {item.placeName}</Text>
                <Text className="mt-3 font-bold text-busan-blue">{item.arrivalTime} 도착 → {item.departureTime} 출발</Text>
                <Text className="mt-2 text-sm text-slate-600">체류 {formatDuration(item.stayMinutes)}</Text>
                {item.activities.length ? <View className="mt-3 flex-row flex-wrap gap-2">{item.activities.map((activity) => <Text key={activity.id} className="rounded bg-blue-50 px-2 py-1 text-xs text-busan-blue">{activity.name} (+{formatDuration(activity.minutes)})</Text>)}</View> : null}
              </View>
            </View>)}
          </View>
          <View className={`mt-6 rounded-xl border-l-4 p-5 ${diagnosis.feasible ? 'border-emerald-600 bg-emerald-50' : 'border-red-600 bg-red-50'}`}>
            <Text className={`text-xl font-black ${diagnosis.feasible ? 'text-emerald-700' : 'text-red-700'}`}>{diagnosis.feasible ? '설정 시간 내 완료 예상' : '종료 시간 초과 예상'}</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-700">{diagnosis.message}</Text>
            <Text className="mt-4 font-bold text-slate-700">사용 가능 시간: {formatDuration(diagnosis.availableMinutes)}</Text>
            <Text className="mt-2 font-bold text-slate-700">총 필요 시간: {formatDuration(diagnosis.requiredMinutes)}</Text>
            <Text className="mt-2 font-bold text-slate-700">총 이동시간: {formatDuration((routes.data ?? []).reduce((sum, route) => sum + route.totalTimeSeconds, 0) / 60)}</Text>
            <Text className="mt-2 font-bold text-slate-700">{diagnosis.feasible ? '여유 시간' : '초과 시간'}: {formatDuration(diagnosis.remainingMinutes)}</Text>
            <Text className="mt-4 text-sm text-slate-700">마지막 방문: {lastStop?.placeName}</Text>
            <Text className="mt-2 text-sm text-slate-700">예상 종료 {lastStop?.departureTime} / 종료 마감 {condition.endTime}</Text>
            <Text className="mt-4 text-xs leading-5 text-slate-500">이 결과는 이동·체류시간 기준입니다. 운영시간·휴무일·날씨에 따른 방문 가능 여부는 아직 반영되지 않았습니다.</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={routes.isFetching} onPress={() => void routes.refetch()} className="mt-4 py-3"><Text className="text-center font-bold text-busan-blue">최신 이동시간으로 다시 진단</Text></Pressable>
        </> : null}
      </ScrollView>
      <View className="absolute bottom-[82px] left-0 right-0 bg-white px-6 pb-4 pt-4">
        <Pressable accessibilityRole="button" className="h-14 items-center justify-center rounded-xl bg-busan-blue" onPress={() => router.push('/planner/map')}><Text className="text-lg font-black text-white">지도에서 경로 보기</Text></Pressable>
      </View>
      <BottomNavigation />
    </SafeAreaView>
  );
}
