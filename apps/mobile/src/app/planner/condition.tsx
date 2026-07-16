import { Href, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Place } from '@/features/planner/types';
import { usePlannerStore } from '@/features/planner/store';
import { mockPlaces } from '@/mocks/places';

const plannerResultRoute = '/planner/result' as Href;

const placeLabels: Record<string, { name: string; category: string; address: string; color: string }> = {
  'place-haeundae-beach': {
    name: '해운대 해수욕장',
    category: '관광지 / 자연',
    address: '부산 해운대구 우동',
    color: '#7DD3FC',
  },
  'place-gwangalli-beach': {
    name: '광안리 해변',
    category: '관광지 / 자연',
    address: '부산 수영구 광안해변로 219',
    color: '#67E8F9',
  },
  'place-gamcheon-culture-village': {
    name: '감천문화마을',
    category: '관광지 / 문화',
    address: '부산 사하구 감내2로 203',
    color: '#FBBF24',
  },
};

function getPlaceView(place: Place) {
  return (
    placeLabels[place.id] ?? {
      name: place.name,
      category: place.category,
      address: place.address,
      color: '#BFDBFE',
    }
  );
}

export default function PlannerConditionPage() {
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [keyword, setKeyword] = useState('');
  const sheetProgress = useRef(new Animated.Value(1)).current;

  const condition = usePlannerStore((state) => state.condition);
  const selectedPlaces = usePlannerStore((state) => state.selectedPlaces);
  const setTravelDate = usePlannerStore((state) => state.setTravelDate);
  const setStartTime = usePlannerStore((state) => state.setStartTime);
  const setEndTime = usePlannerStore((state) => state.setEndTime);
  const setDeparture = usePlannerStore((state) => state.setDeparture);
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
        view.name.toLowerCase().includes(normalizedKeyword) ||
        view.category.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [keyword]);

  const openPlaceSheet = () => {
    setIsSheetVisible(true);
    sheetProgress.setValue(1);
    requestAnimationFrame(() => {
      Animated.timing(sheetProgress, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  };

  const closePlaceSheet = () => {
    Animated.timing(sheetProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsSheetVisible(false);
      }
    });
  };

  const handleAnalyze = () => {
    if (!condition.travelDate.trim()) {
      Alert.alert('입력 확인', '여행 날짜를 입력해주세요.');
      return;
    }

    if (!condition.startTime.trim()) {
      Alert.alert('입력 확인', '시작 시간을 입력해주세요.');
      return;
    }

    if (!condition.endTime.trim()) {
      Alert.alert('입력 확인', '종료 시간을 입력해주세요.');
      return;
    }

    if (!condition.departureName.trim()) {
      Alert.alert('입력 확인', '출발 위치를 입력해주세요.');
      return;
    }

    if (selectedPlaces.length === 0) {
      Alert.alert('선택 확인', '관광지를 최소 1개 이상 선택해주세요.');
      return;
    }

    router.push(plannerResultRoute);
  };

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 560],
  });

  const backdropOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  return (
    <SafeAreaView className="flex-1 bg-busan-surface">
      <View className="border-b border-slate-200 bg-white px-6 py-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl font-black text-busan-blue">M</Text>
          <Text className="text-lg font-extrabold text-busan-blue">Voyage Logic</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-28 pt-10"
        keyboardShouldPersistTaps="handled">
        <Text className="text-[31px] font-black leading-10 text-black">부산 여행 계획하기</Text>
        <Text className="mt-2 text-[15px] text-slate-700">가장 효율적인 경로를 계산해 드립니다.</Text>

        <View className="mt-9 rounded-xl border-l-4 border-busan-blue bg-white p-6 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl font-black text-busan-blue">○</Text>
              <Text className="text-xl font-black text-black">여행 시간 설정</Text>
            </View>
            <View className="rounded-full bg-blue-100 px-4 py-1">
              <Text className="text-xs font-black text-busan-blue">총 9시간</Text>
            </View>
          </View>

          <View className="mt-6">
            <Text className="mb-2 text-sm font-bold text-slate-500">여행 날짜</Text>
            <TextInput
              className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-lg font-extrabold text-black"
              value={condition.travelDate}
              placeholder="2026-07-20"
              placeholderTextColor="#9CA3AF"
              onChangeText={setTravelDate}
            />
          </View>

          <View className="mt-5 flex-row gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-bold text-slate-500">시작 시간</Text>
              <TextInput
                className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-lg font-extrabold text-black"
                value={condition.startTime}
                placeholder="08:00"
                placeholderTextColor="#9CA3AF"
                onChangeText={setStartTime}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-bold text-slate-500">종료 시간</Text>
              <TextInput
                className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-lg font-extrabold text-black"
                value={condition.endTime}
                placeholder="17:00"
                placeholderTextColor="#9CA3AF"
                onChangeText={setEndTime}
              />
            </View>
          </View>
        </View>

        <View className="mt-9 flex-row items-center justify-between">
          <Text className="text-2xl font-black text-black">방문 장소 추가</Text>
          <Pressable accessibilityRole="button" onPress={openPlaceSheet}>
            <Text className="text-sm font-bold text-blue-300">⊕ 관광지 추가</Text>
          </Pressable>
        </View>

        <View className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Text className="mb-2 text-sm font-bold text-slate-500">출발 위치</Text>
          <TextInput
            className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-base font-bold text-black"
            value={condition.departureName}
            placeholder="부산역"
            placeholderTextColor="#9CA3AF"
            onChangeText={(name) => setDeparture({ name })}
          />
        </View>

        {selectedPlaces.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            className="mt-5 h-40 items-center justify-center rounded-sm border border-dashed border-slate-300 bg-busan-surface px-8"
            onPress={openPlaceSheet}>
            <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300">
              <Text className="text-2xl font-black text-slate-300">+</Text>
            </View>
            <Text className="mt-4 text-center text-sm text-slate-500">방문할 장소를 추가해주세요</Text>
            <Text className="mt-1 text-center text-xs leading-5 text-slate-400">
              터치해서 관광지를 검색하고 선택할 수 있습니다.
            </Text>
          </Pressable>
        ) : (
          <View className="mt-5 gap-3">
            {selectedPlaces.map((place) => (
              <Pressable
                key={place.placeId}
                accessibilityRole="button"
                className="flex-row items-center rounded-xl bg-white p-4 shadow-sm"
                onPress={openPlaceSheet}>
                <View
                  className="h-14 w-14 items-center justify-center rounded-md"
                  style={{ backgroundColor: placeLabels[place.placeId]?.color ?? '#BFDBFE' }}>
                  <Text className="text-[10px] font-black text-white">BUSAN</Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-base font-black text-black">
                    {place.order}. {placeLabels[place.placeId]?.name ?? place.name}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-slate-500">
                    체류 {place.stayMinutes}분
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  onPress={() => removePlace(place.placeId)}>
                  <Text className="text-lg font-black text-slate-400">×</Text>
                </Pressable>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50"
              onPress={openPlaceSheet}>
              <Text className="text-sm font-black text-busan-blue">+ 방문 장소 더 추가하기</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-4">
        <Pressable
          accessibilityRole="button"
          className="h-14 items-center justify-center rounded-lg bg-busan-blue shadow-lg shadow-blue-200"
          onPress={handleAnalyze}>
          <Text className="text-lg font-black text-white">일정 분석하기 →</Text>
        </Pressable>
      </View>

      <Modal visible={isSheetVisible} transparent animationType="none" onRequestClose={closePlaceSheet}>
        <View className="flex-1 justify-end">
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              top: 0,
              backgroundColor: '#0F172A',
              opacity: backdropOpacity,
            }}
          />
          <Pressable className="absolute inset-0" onPress={closePlaceSheet} />
          <Animated.View
            style={{
              maxHeight: '84%',
              transform: [{ translateY: sheetTranslateY }],
            }}>
            <View className="rounded-t-[28px] bg-white px-5 pb-8 pt-4">
              <View className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
              <View className="mt-5 flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-black text-black">관광지 선택</Text>
                  <Text className="mt-2 text-sm font-semibold text-slate-500">
                    방문할 관광지를 검색하고 선택하세요
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                  onPress={closePlaceSheet}>
                  <Text className="text-xl font-black text-slate-500">×</Text>
                </Pressable>
              </View>

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

              <ScrollView
                className="mt-5"
                contentContainerClassName="gap-3 pb-3"
                keyboardShouldPersistTaps="handled">
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
                          style={{ backgroundColor: view.color }}>
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
                        <Text className="text-2xl font-light text-slate-300">
                          {isSelected ? '✓' : '›'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                accessibilityRole="button"
                className="mt-3 h-14 items-center justify-center rounded-xl bg-busan-blue"
                onPress={closePlaceSheet}>
                <Text className="text-lg font-black text-white">
                  선택 완료 {selectedPlaces.length > 0 ? `(${selectedPlaces.length})` : ''}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
