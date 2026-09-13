import { Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/layout/BottomNavigation';

type SavedTrip = {
  id: string;
  title: string;
  date: string;
  weekday: string;
  time: string;
  start: string;
  stops: string;
  status: 'impossible' | 'possible';
  badge: string;
};

const plannerConditionRoute = '/planner/condition' as Href;

const savedTrips: SavedTrip[] = [
  {
    id: 'busan-0815',
    title: '8월 15일 부산 일정',
    date: '2026년 8월 15일',
    weekday: '토요일',
    time: '08:00-17:00',
    start: '부산역 출발',
    stops: '4곳 방문',
    status: 'impossible',
    badge: '15분 초과',
  },
  {
    id: 'haeundae-0820',
    title: '8월 20일 해운대 일정',
    date: '2026년 8월 20일',
    weekday: '목요일',
    time: '09:00-18:00',
    start: '서면역 출발',
    stops: '3곳 방문',
    status: 'possible',
    badge: '40분 여유',
  },
  {
    id: 'busan-0902',
    title: '9월 2일 부산 당일치기',
    date: '2026년 9월 2일',
    weekday: '수요일',
    time: '10:00-20:00',
    start: '부산역 출발',
    stops: '5곳 방문',
    status: 'possible',
    badge: '20분 여유',
  },
];

const tripStops = [
  { order: '01', name: '해운대해수욕장', arrival: '08:40 도착', stay: '1시간 30분 체류', depart: '10:10 출발' },
  { order: '02', name: '광안리해변', arrival: '10:45 도착', stay: '1시간 체류', depart: '11:45 출발' },
  { order: '03', name: '감천문화마을', arrival: '12:25 도착', stay: '2시간 체류', depart: '14:25 출발' },
  { order: '04', name: '태종대', arrival: '15:15 도착 예정', stay: '방문 불가', depart: '일정 종료 17:00' },
];

export default function SavedPage() {
  const [selectedTrip, setSelectedTrip] = useState<SavedTrip | null>(null);

  if (selectedTrip) {
    return <SavedTripDetail trip={selectedTrip} onBack={() => setSelectedTrip(null)} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 px-6">
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="text-3xl text-slate-800">‹</Text>
        </Pressable>
        <Text className="text-lg font-black text-black">저장된 일정</Text>
        <Text className="text-2xl text-slate-800">⚙</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-32 pt-7">
        <Text className="text-2xl font-black text-black">저장된 일정</Text>
        <Text className="mt-2 text-sm font-bold text-slate-500">총 {savedTrips.length}개의 일정</Text>

        <View className="mt-6 gap-4">
          {savedTrips.map((trip) => (
            <Pressable
              key={trip.id}
              accessibilityRole="button"
              className={`border-l-4 bg-slate-100 px-5 py-4 ${
                trip.status === 'impossible' ? 'border-red-500' : 'border-busan-blue'
              }`}
              onPress={() => setSelectedTrip(trip)}>
              <View className="flex-row items-center">
                <Text
                  className={`mr-2 rounded px-2 py-1 text-[10px] font-black text-white ${
                    trip.status === 'impossible' ? 'bg-red-500' : 'bg-emerald-600'
                  }`}>
                  {trip.status === 'impossible' ? '일정 불가능' : '일정 가능'}
                </Text>
                <Text
                  className={`text-xs font-black ${
                    trip.status === 'impossible' ? 'text-red-500' : 'text-emerald-600'
                  }`}>
                  {trip.badge}
                </Text>
              </View>

              <View className="mt-3 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-lg font-black text-black">{trip.title}</Text>
                  <View className="mt-3 flex-row flex-wrap gap-x-5 gap-y-2">
                    <Text className="text-xs font-bold text-slate-500">□ {trip.date}</Text>
                    <Text className="text-xs font-bold text-slate-500">◷ {trip.time}</Text>
                    <Text className="text-xs font-bold text-slate-500">⌁ {trip.start}</Text>
                    <Text className="text-xs font-bold text-slate-500">⌖ {trip.stops}</Text>
                  </View>
                </View>
                <Text className="text-3xl text-slate-400">›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          className="mt-7 h-28 items-center justify-center border border-dashed border-slate-200"
          onPress={() => router.push(plannerConditionRoute)}>
          <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-slate-400">
            <Text className="text-xl font-black text-slate-500">+</Text>
          </View>
          <Text className="mt-3 text-sm font-black text-slate-600">새 일정 추가하기</Text>
        </Pressable>
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
}

function SavedTripDetail({ trip, onBack }: { trip: SavedTrip; onBack: () => void }) {
  const [expandedStopOrders, setExpandedStopOrders] = useState<string[]>([]);

  const toggleStopDetails = (order: string) => {
    setExpandedStopOrders((currentOrders) =>
      currentOrders.includes(order)
        ? currentOrders.filter((currentOrder) => currentOrder !== order)
        : [...currentOrders, order],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="h-14 flex-row items-center border-b border-slate-100 px-5">
        <Pressable accessibilityRole="button" className="h-10 w-9 justify-center" onPress={onBack}>
          <Text className="text-2xl text-black">‹</Text>
        </Pressable>
        <Text className="flex-1 text-base font-black text-black">{trip.title}</Text>
        <Text className="mr-3 rounded bg-blue-50 px-2 py-1 text-[10px] font-black text-busan-blue">
          저장된 일정
        </Text>
        <Text className="text-xl text-black">⚙</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-32 pt-5">
        <View className="h-32 justify-end overflow-hidden bg-cyan-500 px-5 pb-4">
          <View className="absolute inset-0 bg-[#60BFE9]" />
          <View className="absolute -right-10 top-8 h-32 w-64 rounded-full bg-white/25" />
          <View className="absolute left-8 top-8 h-12 w-28 rounded-full bg-white/30" />
          <Text className="text-xs font-black text-white/90">Location Summary</Text>
          <Text className="text-xl font-black text-white">부산광역시 수영구/해운대구</Text>
        </View>

        <Text className="mt-7 text-sm font-black text-black">기본 정보</Text>
        <View className="mt-3 flex-row flex-wrap bg-slate-100 px-4 py-5">
          <InfoCell label="날짜" value={`${trip.date}\n${trip.weekday}`} icon="□" />
          <InfoCell label="소요 시간" value={trip.time.replace('-', ' - ') + '\n(9시간)'} icon="◷" />
          <InfoCell label="출발지" value="부산역" icon="⌁" />
          <InfoCell label="방문 장소" value="총 4곳" icon="⌖" />
        </View>

        <Text className="mt-7 text-sm font-black text-black">타당성 분석</Text>
        <View className="mt-3 border-t-4 border-red-500 bg-red-50 px-5 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-black text-red-600">ⓘ 일정 생성 불가</Text>
            <Text className="rounded bg-red-500 px-2 py-1 text-xs font-black text-white">15분 초과됨</Text>
          </View>
          <View className="mt-5 h-[1px] bg-red-100" />
          <View className="mt-4 flex-row">
            <View className="flex-1">
              <Text className="text-xs font-bold text-red-300">사용 가능 시간</Text>
              <Text className="mt-2 text-lg font-black text-red-600">9시간 00분</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-red-300">필요한 시간</Text>
              <Text className="mt-2 text-lg font-black text-red-600">9시간 15분</Text>
            </View>
          </View>
        </View>

        <Text className="mt-7 text-sm font-black text-black">방문 순서 요약</Text>
        <View className="mt-3 gap-3">
          {tripStops.map((stop, index) => {
            const impossible = index === tripStops.length - 1;
            const expanded = expandedStopOrders.includes(stop.order);

            return (
              <View
                key={stop.order}
                className={`bg-slate-100 px-4 py-3 ${impossible ? 'border-l-4 border-red-500 bg-red-50' : ''}`}>
                <View className="flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center bg-black">
                    <Text className="text-xs font-black text-white">{stop.order}</Text>
                  </View>
                  <Text className="ml-3 flex-1 text-sm font-black text-black">{stop.name}</Text>
                  {impossible ? (
                    <Text className="rounded bg-red-100 px-2 py-1 text-[10px] font-black text-red-500">
                      방문 불가
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    className="ml-3 h-8 w-8 items-center justify-center"
                    onPress={() => toggleStopDetails(stop.order)}>
                    <Text className="text-base font-black text-slate-500">{expanded ? '⌃' : '⌄'}</Text>
                  </Pressable>
                </View>

                {expanded ? (
                  <View>
                    <View className="mt-3 flex-row justify-between">
                      <Text className="text-[11px] font-bold text-slate-500">{stop.arrival}</Text>
                      <Text className="text-[11px] font-bold text-slate-500">{stop.stay}</Text>
                      <Text className="text-[11px] font-bold text-slate-500">{stop.depart}</Text>
                    </View>
                    {impossible ? (
                      <View className="mt-3 flex-row justify-between border-t border-red-100 pt-2">
                        <Text className="text-[11px] font-black text-red-500">방문 불가 · 15분 초과</Text>
                        <Text className="text-[11px] font-black text-red-500">예상 종료 17:15</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
}

function InfoCell({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View className="w-1/2 flex-row pb-5">
      <Text className="mr-2 text-busan-blue">{icon}</Text>
      <View>
        <Text className="text-[10px] font-bold text-slate-500">{label}</Text>
        <Text className="mt-1 text-xs font-black leading-5 text-black">{value}</Text>
      </View>
    </View>
  );
}
