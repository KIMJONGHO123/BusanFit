import { Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
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

import { DepartureInput } from '@/components/DepartureInput';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { activityIcons, getActivityMinutes, placeActivities } from '@/features/planner/activities';
import type { ActivityId, Place } from '@/features/planner/types';
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
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<ActivityId[]>([]);
  const [customActivityMinutes, setCustomActivityMinutes] = useState('');
  const [sheetProgress] = useState(() => new Animated.Value(1));

  const condition = usePlannerStore((state) => state.condition);
  const selectedPlaces = usePlannerStore((state) => state.selectedPlaces);
  const setTravelDate = usePlannerStore((state) => state.setTravelDate);
  const setStartTime = usePlannerStore((state) => state.setStartTime);
  const setEndTime = usePlannerStore((state) => state.setEndTime);
  const setPlaceActivities = usePlannerStore((state) => state.setPlaceActivities);
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
    setActivePlace(null);
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

  const openActivitySheet = (place: Place) => {
    const selectedPlace = selectedPlaces.find((item) => item.placeId === place.id);
    setSelectedActivityIds(selectedPlace?.activities.map((activity) => activity.id) ?? []);
    const customActivity = selectedPlace?.activities.find((activity) => activity.id === 'other');
    setCustomActivityMinutes(customActivity ? String(customActivity.minutes) : '');
    setActivePlace(place);

    if (!isSheetVisible) {
      setIsSheetVisible(true);
      sheetProgress.setValue(1);
      requestAnimationFrame(() => {
        Animated.timing(sheetProgress, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const toggleActivity = (activityId: ActivityId) => {
    setSelectedActivityIds((current) =>
      current.includes(activityId)
        ? current.filter((id) => id !== activityId)
        : [...current, activityId],
    );
  };

  const confirmActivities = () => {
    if (!activePlace) {
      return;
    }

    const customMinutes = Number(customActivityMinutes);

    if (
      selectedActivityIds.includes('other') &&
      (!Number.isInteger(customMinutes) || customMinutes <= 0)
    ) {
      Alert.alert('입력 확인', '기타 활동 시간을 1분 이상 입력해주세요.');
      return;
    }

    setPlaceActivities(
      activePlace,
      placeActivities
        .filter((activity) => selectedActivityIds.includes(activity.id))
        .map((activity) =>
          activity.id === 'other' ? { ...activity, minutes: customMinutes } : activity,
        ),
    );
    closePlaceSheet();
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

    if (!condition.departureName.trim() || condition.departureLatitude === undefined || condition.departureLongitude === undefined) {
      Alert.alert('입력 확인', '검색 결과에서 출발 위치를 선택해주세요.');
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

  const canAnalyze =
    condition.travelDate.trim().length > 0 &&
    condition.startTime.trim().length > 0 &&
    condition.endTime.trim().length > 0 &&
    condition.departureName.trim().length > 0 &&
    selectedPlaces.length > 0;
  const selectedActivityMinutes = placeActivities
    .filter((activity) => selectedActivityIds.includes(activity.id))
    .reduce(
      (total, activity) =>
        total +
        (activity.id === 'other' ? Number(customActivityMinutes) || 0 : activity.minutes),
      0,
    );

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
        contentContainerClassName="px-6 pb-52 pt-10"
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
            <TextInput className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-base font-bold text-black" value={condition.travelDate} placeholder="YYYY-MM-DD" onChangeText={setTravelDate} />
          </View>
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-bold text-slate-500">시작 시간</Text>
              <TextInput className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-base font-bold text-black" value={condition.startTime} placeholder="08:00" onChangeText={setStartTime} />
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-bold text-slate-500">종료 시간</Text>
              <TextInput className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-base font-bold text-black" value={condition.endTime} placeholder="17:00" onChangeText={setEndTime} />
            </View>
          </View>
          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-slate-500">출발 위치</Text>
            <DepartureInput />
          </View>
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
            {selectedPlaces.map((place) => {
              const sourcePlace = mockPlaces.find((item) => item.id === place.placeId);
              const activityMinutes = getActivityMinutes(place.activities);

              return (
              <Pressable
                key={place.placeId}
                accessibilityRole="button"
                className="flex-row items-center rounded-xl bg-white p-4 shadow-sm"
                onPress={() => sourcePlace && openActivitySheet(sourcePlace)}>
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
                    관광지 · 기본 체류 {place.stayMinutes}분
                  </Text>
                  {place.activities.length > 0 ? (
                    <View className="mt-2 flex-row flex-wrap gap-1">
                      {place.activities.map((activity) => (
                        <Text
                          key={activity.id}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
                          {activity.name} (+{activity.minutes}분)
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {activityMinutes > 0 ? (
                    <Text className="mt-2 text-[11px] font-black text-busan-blue">
                      총 체류 {place.stayMinutes + activityMinutes}분
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  onPress={() => removePlace(place.placeId)}>
                  <Text className="text-lg font-black text-slate-400">×</Text>
                </Pressable>
              </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              className="h-12 items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50"
              onPress={openPlaceSheet}>
              <Text className="text-sm font-black text-busan-blue">+ 방문 장소 더 추가하기</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-[82px] left-0 right-0 bg-white px-6 pb-4 pt-4">
        <Pressable
          accessibilityRole="button"
          disabled={!canAnalyze}
          className={`h-14 items-center justify-center rounded-lg shadow-lg shadow-blue-200 ${
            canAnalyze ? 'bg-busan-blue' : 'bg-blue-200'
          }`}
          onPress={handleAnalyze}>
          <Text className="text-lg font-black text-white">일정 분석하기 →</Text>
        </Pressable>
      </View>
      <BottomNavigation />

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
              height: '84%',
              transform: [{ translateY: sheetTranslateY }],
            }}>
            {activePlace ? (
              <View className="flex-1 rounded-t-[28px] bg-white px-5 pb-8 pt-4">
                <View className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
                <Text className="mt-5 text-2xl font-black text-black">활동 선택</Text>
                <Text className="mt-2 text-sm font-semibold text-slate-500">
                  이 장소에서 할 활동을 선택하세요
                </Text>

                <View className="mt-6 flex-row items-center rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <View
                    className="h-16 w-16 items-center justify-center rounded-lg"
                    style={{ backgroundColor: getPlaceView(activePlace).color }}>
                    <Text className="text-[10px] font-black text-white">BUSAN</Text>
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-xs font-black text-busan-blue">⌖ 현재 선택된 장소</Text>
                    <Text className="mt-2 text-xl font-black text-black">
                      {getPlaceView(activePlace).name}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold text-slate-500">
                      {getPlaceView(activePlace).address}
                    </Text>
                  </View>
                </View>

                <ScrollView
                  className="mt-5 flex-1"
                  contentContainerClassName="gap-3 pb-3"
                  keyboardShouldPersistTaps="handled">
                  {placeActivities.map((activity) => {
                    const selected = selectedActivityIds.includes(activity.id);

                    return (
                      <View key={activity.id}>
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          className={`h-20 flex-row items-center rounded-2xl border px-4 ${
                            selected ? 'border-2 border-busan-blue bg-blue-50' : 'border-slate-200 bg-white'
                          }`}
                          onPress={() => toggleActivity(activity.id)}>
                          <View
                            className={`h-11 w-11 items-center justify-center rounded-lg ${
                              selected ? 'bg-busan-blue' : 'bg-slate-100'
                            }`}>
                            <Text className={`text-lg ${selected ? 'text-white' : 'text-slate-500'}`}>
                              {activityIcons[activity.id]}
                            </Text>
                          </View>
                          <Text className={`ml-4 flex-1 text-base font-black ${selected ? 'text-busan-blue' : 'text-slate-800'}`}>
                            {activity.name}
                          </Text>
                          <Text className={`text-sm font-black ${selected ? 'text-busan-blue' : 'text-slate-500'}`}>
                            {activity.id === 'other' ? '직접 입력' : `+${activity.minutes}분`}{' '}
                            {selected ? '●' : ''}
                          </Text>
                        </Pressable>
                        {activity.id === 'other' && selected ? (
                          <View className="mt-2 flex-row items-center rounded-xl border border-blue-200 bg-blue-50 px-4">
                            <TextInput
                              accessibilityLabel="기타 활동 시간"
                              className="h-12 flex-1 text-base font-black text-black"
                              value={customActivityMinutes}
                              keyboardType="number-pad"
                              maxLength={3}
                              placeholder="예: 45"
                              placeholderTextColor="#94A3B8"
                              onChangeText={(value) =>
                                setCustomActivityMinutes(value.replace(/[^0-9]/g, ''))
                              }
                            />
                            <Text className="font-black text-busan-blue">분</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>

                <View className="mt-3 flex-row gap-3 border-t border-slate-100 pt-4">
                  <Pressable
                    accessibilityRole="button"
                    className="h-14 w-20 items-center justify-center rounded-xl bg-slate-100"
                    onPress={() => setActivePlace(null)}>
                    <Text className="font-black text-slate-600">이전</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="h-14 flex-1 items-center justify-center rounded-xl bg-busan-blue"
                    onPress={confirmActivities}>
                    <Text className="text-lg font-black text-white">
                      일정에 추가하기
                      {selectedActivityIds.length > 0 ? ` (+${selectedActivityMinutes}분)` : ''}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-1 rounded-t-[28px] bg-white px-5 pb-8 pt-4">
                <View className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
                <View className="mt-5 flex-row items-center justify-between">
                  <View>
                    <Text className="text-2xl font-black text-black">관광지 선택</Text>
                    <Text className="mt-2 text-sm font-semibold text-slate-500">
                      관광지를 선택한 다음 활동을 추가하세요
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
                  className="mt-5 flex-1"
                  contentContainerClassName="gap-3 pb-3"
                  keyboardShouldPersistTaps="handled">
                  {filteredPlaces.map((place) => {
                    const view = getPlaceView(place);
                    const selectedPlace = selectedPlaces.find((item) => item.placeId === place.id);

                    return (
                      <Pressable
                        key={place.id}
                        accessibilityRole="button"
                        className={`rounded-xl border bg-white p-3 ${
                          selectedPlace ? 'border-busan-blue bg-blue-50' : 'border-slate-100'
                        }`}
                        onPress={() => openActivitySheet(place)}>
                        <View className="flex-row items-center">
                          <View
                            className="h-[68px] w-[68px] items-center justify-center rounded-md"
                            style={{ backgroundColor: view.color }}>
                            <Text className="text-xs font-black text-white">BUSAN</Text>
                          </View>
                          <View className="ml-4 flex-1">
                            <Text className="rounded bg-blue-50 px-2 py-1 text-[10px] font-black text-busan-blue">
                              {view.category}
                            </Text>
                            <Text className="mt-2 text-lg font-black text-black">{view.name}</Text>
                            <Text className="mt-1 text-xs font-semibold text-slate-500">
                              기준 체류: {place.estimatedStayMinutes}분
                              {selectedPlace?.activities.length
                                ? ` · 활동 ${getActivityMinutes(selectedPlace.activities)}분`
                                : ''}
                            </Text>
                          </View>
                          <Text className="text-2xl font-light text-slate-300">›</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
