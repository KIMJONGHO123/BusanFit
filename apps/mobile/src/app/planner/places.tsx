import { Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Place } from '@/features/planner/types';
import { usePlannerStore } from '@/features/planner/store';
import { mockPlaces } from '@/mocks/places';

const plannerResultRoute = '/planner/result' as Href;

const placeLabels: Record<string, { name: string; category: string; address: string; image: string }> = {
  'place-haeundae-beach': {
    name: '해운대 해수욕장',
    category: '관광지 / 자연',
    address: '부산 해운대구 우동',
    image: '#7DD3FC',
  },
  'place-gwangalli-beach': {
    name: '광안리 해변',
    category: '관광지 / 자연',
    address: '부산 수영구 광안해변로 219',
    image: '#67E8F9',
  },
  'place-gamcheon-culture-village': {
    name: '감천문화마을',
    category: '관광지 / 문화',
    address: '부산 사하구 감내2로 203',
    image: '#FBBF24',
  },
};

function getPlaceView(place: Place) {
  return placeLabels[place.id] ?? {
    name: place.name,
    category: place.category,
    address: place.address,
    image: '#BFDBFE',
  };
}

export default function PlannerPlacesPage() {
  const [keyword, setKeyword] = useState('');
  const selectedPlaces = usePlannerStore((state) => state.selectedPlaces);
  const addPlace = usePlannerStore((state) => state.addPlace);
  const removePlace = usePlannerStore((state) => state.removePlace);

  const filteredPlaces = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return mockPlaces;
    }

    return mockPlaces.filter((place) => {
      const view = getPlaceView(place);
      return (
        place.name.toLowerCase().includes(normalizedKeyword) ||
        view.name.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [keyword]);

  const handleDiagnose = () => {
    if (selectedPlaces.length === 0) {
      Alert.alert('선택 확인', '관광지를 최소 1개 이상 선택해주세요.');
      return;
    }

    router.push(plannerResultRoute);
  };

  return (
    <SafeAreaView className="flex-1 bg-busan-surface">
      <View className="border-b border-slate-200 bg-white px-5 py-4">
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text className="text-2xl text-slate-700">‹</Text>
          </Pressable>
          <Text className="text-base font-bold text-busan-ink">Travel Planner</Text>
          <Text className="text-xl text-busan-blue">⌂</Text>
        </View>
        <Text className="mt-5 text-xs text-slate-400">부산 여행 일정</Text>
        <Text className="mt-2 text-sm text-slate-400">관광지를 검색하고 방문 순서를 정하세요</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-40 pt-6"
        keyboardShouldPersistTaps="handled">
        <View className="rounded-[24px] bg-white px-5 pb-6 pt-4 shadow-sm">
          <View className="mx-auto mb-5 h-1 w-12 rounded-full bg-slate-200" />
          <Text className="text-2xl font-black text-black">관광지 선택</Text>

          <View className="mt-5 h-12 flex-row items-center rounded-lg bg-slate-50 px-4">
            <Text className="mr-2 text-lg text-slate-400">⌕</Text>
            <TextInput
              className="flex-1 text-[15px] font-semibold text-slate-900"
              value={keyword}
              placeholder="부산 관광지를 검색하세요"
              placeholderTextColor="#94A3B8"
              onChangeText={setKeyword}
            />
          </View>

          <View className="mt-5 gap-3">
            {filteredPlaces.map((place) => {
              const view = getPlaceView(place);
              const selectedPlace = selectedPlaces.find((item) => item.placeId === place.id);
              const isSelected = Boolean(selectedPlace);

              return (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  className={`rounded-xl border bg-white p-3 ${
                    isSelected ? 'border-busan-blue bg-blue-50' : 'border-slate-100'
                  }`}
                  onPress={() => (isSelected ? removePlace(place.id) : addPlace(place))}>
                  <View className="flex-row items-center">
                    <View
                      className="h-[68px] w-[68px] items-center justify-center rounded-md"
                      style={{ backgroundColor: view.image }}>
                      <Text className="text-xs font-black text-white">BUSAN</Text>
                    </View>
                    <View className="ml-4 flex-1">
                      <View className="flex-row items-center">
                        <Text className="rounded bg-blue-50 px-2 py-1 text-[10px] font-black text-busan-blue">
                          {view.category}
                        </Text>
                        {selectedPlace ? (
                          <Text className="ml-2 rounded-full bg-busan-blue px-2 py-1 text-[11px] font-black text-white">
                            {selectedPlace.order}번째
                          </Text>
                        ) : null}
                      </View>
                      <Text className="mt-2 text-lg font-black text-black">{view.name}</Text>
                      <Text className="mt-1 text-xs font-semibold text-slate-500">
                        기준 체류: {place.estimatedStayMinutes}분
                      </Text>
                    </View>
                    <Text className="text-2xl font-light text-slate-300">{isSelected ? '✓' : '›'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-5 rounded-xl bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-black text-black">선택한 관광지</Text>
            <Text className="text-sm font-black text-busan-blue">{selectedPlaces.length}개</Text>
          </View>
          {selectedPlaces.length === 0 ? (
            <Text className="mt-4 text-sm text-slate-500">아직 선택한 관광지가 없습니다.</Text>
          ) : (
            <View className="mt-4 gap-3">
              {selectedPlaces.map((place) => (
                <View key={place.placeId} className="flex-row items-center justify-between">
                  <Text className="flex-1 text-sm font-bold text-slate-800">
                    {place.order}. {placeLabels[place.placeId]?.name ?? place.name}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    className="rounded-md bg-slate-100 px-3 py-2"
                    onPress={() => removePlace(place.placeId)}>
                    <Text className="text-xs font-black text-slate-500">삭제</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-4">
        <Pressable
          accessibilityRole="button"
          className="h-14 items-center justify-center rounded-xl bg-busan-blue shadow-lg shadow-blue-200"
          onPress={handleDiagnose}>
          <Text className="text-lg font-black text-white">일정 진단하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
