import { Href, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const plannerConditionRoute = '/planner/condition' as Href;

export default function HomePage() {
  return (
    <SafeAreaView className="flex-1 bg-busan-surface">
      <View className="flex-1 px-6 pb-5 pt-3">
        <View className="flex-row items-center justify-between border-b border-slate-100 pb-5">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-black text-busan-blue">M</Text>
            <Text className="text-base font-extrabold text-busan-blue">Voyage Logic</Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-200">
            <Text className="text-xs font-bold text-slate-600">ME</Text>
          </View>
        </View>

        <View className="flex-1 justify-center">
          <View className="items-center">
            <Text className="text-center text-3xl font-black text-black">여행 일정 진단기</Text>
            <Text className="mt-4 max-w-[260px] text-center text-[15px] leading-6 text-slate-600">
              여행 시간을 입력하고 일정이 가능한지 확인해보세요
            </Text>
          </View>

          <View className="mt-10 overflow-hidden rounded-[22px] bg-slate-100 px-5 pb-6 pt-8 shadow-sm">
            <View className="h-36 rounded-xl bg-white px-4 py-5">
              <View className="h-20 rounded-lg bg-slate-100">
                <View className="absolute left-5 top-8 h-3 w-3 rounded-full bg-slate-500" />
                <View className="absolute left-20 top-14 h-3 w-3 rounded-full bg-slate-500" />
                <View className="absolute right-12 top-8 h-3 w-3 rounded-full bg-slate-500" />
                <View className="absolute left-8 right-14 top-10 h-[1px] rotate-6 bg-slate-300" />
              </View>
              <View className="-mt-2 ml-2 mr-3 flex-row items-center rounded-xl bg-white p-3 shadow">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-md bg-busan-blue">
                  <Text className="text-base font-black text-white">✓</Text>
                </View>
                <View>
                  <Text className="text-[11px] font-black uppercase text-busan-blue">
                    Feasibility Check
                  </Text>
                  <Text className="text-base font-black text-black">완벽한 타이밍</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-8 flex-row gap-3">
            <View className="flex-1 rounded-lg border border-slate-200 bg-white p-4">
              <Text className="text-xl font-black text-busan-blue">○</Text>
              <Text className="mt-3 text-xs text-slate-700">이동 시간</Text>
              <Text className="mt-1 text-base font-black text-black">분 단위 계산</Text>
            </View>
            <View className="flex-1 rounded-lg border border-slate-200 bg-white p-4">
              <Text className="text-xl font-black text-emerald-600">△</Text>
              <Text className="mt-3 text-xs text-slate-700">혼잡도</Text>
              <Text className="mt-1 text-base font-black text-black">실시간 반영</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          className="h-[58px] flex-row items-center justify-center rounded-xl bg-busan-blue shadow-lg shadow-blue-300"
          onPress={() => router.push(plannerConditionRoute)}>
          <Text className="text-lg font-black text-white">일정 만들기 시작 →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
