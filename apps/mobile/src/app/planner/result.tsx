import { Href, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mockDiagnosis } from '@/mocks/diagnosis';

const plannerMapRoute = '/planner/map' as Href;

const placeNames: Record<string, string> = {
  'place-haeundae-beach': '해운대 해수욕장',
  'place-gwangalli-beach': '광안리 해변',
  'place-gamcheon-culture-village': '감천문화마을',
};

export default function PlannerResultPage() {
  const feasible = mockDiagnosis.feasible;
  const remainingLabel =
    mockDiagnosis.remainingMinutes >= 0
      ? `여유 시간: ${mockDiagnosis.remainingMinutes}분`
      : `${Math.abs(mockDiagnosis.remainingMinutes)}분 초과됨`;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 px-6">
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="text-3xl text-busan-ink">‹</Text>
        </Pressable>
        <Text className="text-lg font-black text-black">Travel Feasibility</Text>
        <Text className="text-xl font-black text-busan-ink">⚙</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28 pt-7">
        <View className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-black text-slate-600">여행 시간</Text>
              <Text className="mt-2 text-2xl font-black text-busan-blue">
                07:00 - 17:00
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-black text-black">6월 15일 (토)</Text>
              <Text className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                총 {Math.round(mockDiagnosis.availableMinutes / 60)}시간
              </Text>
            </View>
          </View>
        </View>

        <View
          className={`mt-8 rounded-xl border-l-4 bg-white p-6 shadow-sm ${
            feasible ? 'border-emerald-600' : 'border-red-600'
          }`}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text
                className={`text-[11px] font-black uppercase tracking-wider ${
                  feasible ? 'text-emerald-700' : 'text-red-600'
                }`}>
                Feasibility Alert
              </Text>
              <Text
                className={`mt-3 text-3xl font-black ${
                  feasible ? 'text-emerald-700' : 'text-red-600'
                }`}>
                {feasible ? '일정 생성 가능' : '일정 생성 불가'}
              </Text>
            </View>
            <View className={`rounded-lg px-4 py-2 ${feasible ? 'bg-emerald-600' : 'bg-red-600'}`}>
              <Text className="text-xs font-black text-white">{remainingLabel}</Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-5 text-slate-600">{mockDiagnosis.message}</Text>

          <View className={`mt-6 flex-row rounded-md ${feasible ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <View className="flex-1 items-center py-4">
              <Text className="text-[11px] font-bold text-slate-600">사용 가능 시간</Text>
              <Text className="mt-2 text-base font-black text-black">
                {Math.round(mockDiagnosis.availableMinutes / 60)}시간
              </Text>
            </View>
            <View className="w-[1px] bg-white" />
            <View className="flex-1 items-center py-4">
              <Text className="text-[11px] font-bold text-slate-600">총 필요 시간</Text>
              <Text className="mt-2 text-base font-black text-black">
                {Math.floor(mockDiagnosis.requiredMinutes / 60)}시간 {mockDiagnosis.requiredMinutes % 60}분
              </Text>
            </View>
            <View className="w-[1px] bg-white" />
            <View className="flex-1 items-center py-4">
              <Text className="text-[11px] font-bold text-slate-600">여유 시간</Text>
              <Text className={`mt-2 text-base font-black ${feasible ? 'text-emerald-700' : 'text-red-600'}`}>
                {Math.abs(mockDiagnosis.remainingMinutes)}분
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-9">
          {mockDiagnosis.schedule.map((item, index) => (
            <View key={item.placeId} className="flex-row">
              <View className="w-7 items-center">
                <View className="h-4 w-4 rounded-full bg-busan-blue" />
                <View className="min-h-[86px] w-[1px] flex-1 border-l border-dashed border-blue-200" />
              </View>
              <View className="flex-1 pb-5">
                <View className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-black text-black">
                      {placeNames[item.placeId] ?? item.placeName}
                    </Text>
                    <Text className="rounded bg-blue-50 px-2 py-1 text-xs font-black text-busan-blue">
                      {item.arrivalTime} 도착
                    </Text>
                  </View>
                  <Text className="mt-3 text-sm font-semibold text-slate-600">
                    체류 {Math.floor(item.stayMinutes / 60)}시간 {item.stayMinutes % 60}분
                  </Text>
                </View>
                {index < mockDiagnosis.schedule.length - 1 ? (
                  <Text className="ml-1 mt-4 text-sm font-semibold text-slate-600">
                    이동: {mockDiagnosis.schedule[index + 1].travelMinutesFromPrevious}분
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View
          className={`ml-7 rounded-xl border border-dashed p-6 ${
            feasible ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
          }`}>
          <View className="flex-row items-center justify-between">
            <Text className={`text-lg font-black ${feasible ? 'text-emerald-700' : 'text-red-600'}`}>
              태종대
            </Text>
            <Text
              className={`rounded px-3 py-1 text-xs font-black text-white ${
                feasible ? 'bg-emerald-600' : 'bg-red-600'
              }`}>
              {feasible ? '방문 가능' : '방문 불가'}
            </Text>
          </View>
          <Text className={`mt-6 text-lg font-black ${feasible ? 'text-emerald-700' : 'text-red-600'}`}>
            {feasible ? '일정 내 소화 가능' : '종료 시간 초과'}
          </Text>
          <View className="mt-5 gap-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-600">도착 예정</Text>
              <Text className={`font-black ${feasible ? 'text-emerald-700' : 'text-red-600'}`}>16:30</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-600">종료 마감</Text>
              <Text className="font-black text-black">17:00</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-4">
        <Pressable
          accessibilityRole="button"
          className="h-14 items-center justify-center rounded-xl bg-busan-blue"
          onPress={() => router.push(plannerMapRoute)}>
          <Text className="text-lg font-black text-white">지도에서 경로 보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
