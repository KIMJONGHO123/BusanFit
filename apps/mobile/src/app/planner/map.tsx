import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlannerStore } from '@/features/planner/store';

const placeNames: Record<string, string> = {
  'place-haeundae-beach': '해운대 해수욕장',
  'place-gwangalli-beach': '광안리 해변',
  'place-gamcheon-culture-village': '감천문화마을',
};

export default function PlannerMapPage() {
  const condition = usePlannerStore((state) => state.condition);
  const selectedPlaces = usePlannerStore((state) => state.selectedPlaces);
  const orderedPlaces = [...selectedPlaces].sort((first, second) => first.order - second.order);
  const firstPlace = orderedPlaces[0];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 bg-[#DDEFF4]">
        <View className="absolute left-0 right-0 top-0 z-20 px-5 pt-4">
          <View className="h-14 flex-row items-center rounded-sm bg-white px-4 shadow">
            <Text className="mr-3 text-2xl text-slate-700">⌕</Text>
            <Text className="flex-1 text-sm font-semibold text-slate-500">장소 검색</Text>
            <Text className="text-xl text-slate-600">⌾</Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            {['카페', '맛집', '숙소', '주차장'].map((item, index) => (
              <View
                key={item}
                className={`rounded-full px-4 py-2 ${index === 0 ? 'bg-busan-blue' : 'bg-white'}`}>
                <Text className={`text-xs font-black ${index === 0 ? 'text-white' : 'text-slate-800'}`}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="absolute inset-0">
          <View className="absolute left-0 right-0 top-0 h-[52%] bg-[#EEF6EF]" />
          <View className="absolute bottom-0 left-0 right-0 h-[48%] bg-[#87D6E6]" />
          <View className="absolute left-[-40px] top-[170px] h-[360px] w-[360px] rounded-full border-[18px] border-white/70" />
          <View className="absolute right-[-80px] top-[90px] h-[280px] w-[280px] rounded-full border-[14px] border-white/60" />
          <View className="absolute left-16 top-44 h-2 w-56 rotate-[-25deg] rounded-full bg-white/80" />
          <View className="absolute left-24 top-72 h-2 w-72 rotate-[16deg] rounded-full bg-white/80" />
        </View>

        <View className="absolute right-5 top-[40%] z-10 overflow-hidden rounded-md bg-white shadow">
          <Pressable className="h-12 w-12 items-center justify-center border-b border-slate-100">
            <Text className="text-2xl font-light text-black">＋</Text>
          </Pressable>
          <Pressable className="h-12 w-12 items-center justify-center">
            <Text className="text-2xl font-light text-black">−</Text>
          </Pressable>
        </View>

        <View className="absolute right-5 top-[34%] z-10 h-12 w-12 items-center justify-center rounded-md bg-white shadow">
          <Text className="text-xl text-black">◎</Text>
        </View>

        <View className="absolute left-[58%] top-[43%] z-10">
          <View className="h-6 w-6 items-center justify-center rounded-full bg-busan-blue">
            <View className="h-2 w-2 rounded-full bg-white" />
          </View>
          <View className="-ml-9 -mt-12 rounded-full bg-busan-blue px-3 py-2">
            <Text className="text-xs font-black text-white">해운대 해수욕장</Text>
          </View>
        </View>

        {orderedPlaces.slice(1).map((place, index) => (
          <View
            key={place.placeId}
            className="absolute z-10"
            style={{ left: index === 0 ? '36%' : '24%', top: index === 0 ? '52%' : '66%' }}>
            <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-busan-blue bg-white">
              <View className="h-2 w-2 rounded-full bg-busan-blue" />
            </View>
            <View className="-ml-10 -mt-10 rounded-full bg-white px-3 py-2 shadow">
              <Text className="text-xs font-black text-slate-800">
                {placeNames[place.placeId] ?? place.name}
              </Text>
            </View>
          </View>
        ))}

        <View className="absolute bottom-[86px] left-6 right-6 z-20">
          <View className="flex-row overflow-hidden rounded-sm bg-white shadow-lg">
            <View className="h-24 w-24 items-center justify-center bg-cyan-300">
              <Text className="text-xs font-black text-white">BUSAN</Text>
            </View>
            <View className="flex-1 px-4 py-3">
              <Text className="text-base font-black text-black">
                {firstPlace ? placeNames[firstPlace.placeId] ?? firstPlace.name : '선택한 관광지 없음'}
              </Text>
              <Text className="mt-2 text-xs font-semibold text-busan-blue">
                2시간 체류
              </Text>
              <Text className="mt-3 text-xs font-black text-busan-blue">여행 경로</Text>
            </View>
            <View className="h-24 w-20 items-center justify-center bg-slate-700">
              <Text className="text-xs font-black text-white">NIGHT</Text>
            </View>
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 z-30 flex-row border-t border-slate-100 bg-white px-3 pb-4 pt-3">
          <Pressable className="flex-1 items-center" onPress={() => router.back()}>
            <Text className="text-lg text-slate-400">□</Text>
            <Text className="mt-1 text-xs font-bold text-slate-400">일정 생성</Text>
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-lg text-slate-400">☑</Text>
            <Text className="mt-1 text-xs font-bold text-slate-400">진단</Text>
          </View>
          <View className="flex-1 items-center rounded-lg bg-blue-50 py-1">
            <Text className="text-lg text-busan-blue">▰</Text>
            <Text className="mt-1 text-xs font-black text-busan-blue">지도</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-lg text-slate-400">◇</Text>
            <Text className="mt-1 text-xs font-bold text-slate-400">저장</Text>
          </View>
        </View>

        <View className="absolute left-5 top-[27%] z-10 rounded-full bg-white px-3 py-2 shadow">
          <Text className="text-xs font-black text-slate-800">
            출발: {condition.departureName || '출발 위치 없음'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
