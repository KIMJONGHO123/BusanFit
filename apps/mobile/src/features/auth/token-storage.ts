import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'busanfit.accessToken';

export async function saveAccessToken(accessToken: string): Promise<void> {
  // 웹에서는 SecureStore를 사용할 수 없으므로 localStorage에 저장합니다.
  if (Platform.OS === 'web') {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    return;
  }

  // iOS/Android에서는 Expo SecureStore를 사용해 토큰을 안전하게 저장합니다.
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
}

export async function loadAccessToken(): Promise<string | null> {
  // 앱 시작 시 저장된 토큰을 읽어 로그인 유지 여부를 판단합니다.
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function deleteAccessToken(): Promise<void> {
  // 로그아웃 또는 401 응답을 받으면 저장된 토큰을 삭제합니다.
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
