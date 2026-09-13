import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, TextInput, View } from 'react-native';
import { searchPlaces } from '@/api/places';
import { usePlannerStore } from '@/features/planner/store';

export function DepartureInput() {
  const condition = usePlannerStore((state) => state.condition);
  const setDeparture = usePlannerStore((state) => state.setDeparture);
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(condition.departureName.trim()), 400);
    return () => clearTimeout(timer);
  }, [condition.departureName]);
  const selected = condition.departureLatitude !== undefined && condition.departureLongitude !== undefined;
  const query = useQuery({ queryKey: ['departure-search', keyword], queryFn: () => searchPlaces(keyword), enabled: keyword.length > 0 && !selected, retry: false });
  return <View>
    <TextInput value={condition.departureName} onChangeText={(name) => setDeparture({ name })} placeholder="출발지 이름 검색" className="h-14 rounded-md border border-slate-200 bg-slate-50 px-4 text-base font-bold text-black" />
    {selected ? <Text className="mt-2 text-xs text-emerald-700">출발 위치 선택 완료</Text> : <>
      <Text className="mt-2 text-xs text-slate-500">검색 결과에서 출발 위치를 선택해 주세요.</Text>
      <Pressable accessibilityRole="button" className="mt-2 rounded-md bg-blue-50 p-3" onPress={() => setDeparture({ name: '부산역', latitude: 35.1151, longitude: 129.0414 })}><Text className="font-bold text-busan-blue">부산역에서 출발</Text></Pressable>
      {query.isFetching ? <Text className="mt-2 text-xs text-slate-500">출발지 검색 중…</Text> : null}
      {query.isError ? <Pressable onPress={() => void query.refetch()}><Text className="mt-2 text-xs text-red-600">검색에 실패했습니다. 다시 검색</Text></Pressable> : null}
      {keyword === condition.departureName.trim() ? query.data?.slice(0, 5).map((place) => <Pressable key={place.id} className="border-b border-slate-100 py-3" onPress={() => setDeparture({ name: place.name, latitude: place.latitude, longitude: place.longitude })}><Text className="font-bold">{place.name}</Text><Text className="text-xs text-slate-500">{place.address}</Text></Pressable>) : null}
      {query.isSuccess && !query.data.length ? <Text className="mt-2 text-xs text-slate-500">검색 결과가 없습니다. 다른 이름으로 검색해 주세요.</Text> : null}
    </>}
  </View>;
}
