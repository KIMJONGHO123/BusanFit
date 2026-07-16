import '../../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/lib/query-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="planner/condition" />
          <Stack.Screen name="planner/places" />
          <Stack.Screen name="planner/result" />
          <Stack.Screen name="planner/map" />
          <Stack.Screen name="planner/time" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
