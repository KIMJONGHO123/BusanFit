import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';

export default function PlannerMapWebPage() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4">
        <Text className="text-xl font-bold text-slate-900">앱에서 지도를 확인해 주세요</Text>
        <Text className="text-center text-sm leading-6 text-slate-600">
          지도와 이동 경로는 Android 및 iOS 앱에서 제공됩니다.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="rounded-lg bg-busan-blue px-6 py-3"
          onPress={() => router.replace('/planner/result')}>
          <Text className="font-bold text-white">일정 결과로 돌아가기</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
