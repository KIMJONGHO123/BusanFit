import { create } from 'axios';

// 모바일 앱 전체에서 공통으로 사용하는 백엔드 API 클라이언트입니다.
export const apiClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthorizationToken(accessToken: string | null): void {
  // 로그인 후에는 모든 API 요청에 Authorization: Bearer {token} 헤더가 자동으로 붙습니다.
  if (accessToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return;
  }

  // 로그아웃 또는 토큰 만료 시에는 이전 토큰이 다음 요청에 섞이지 않도록 제거합니다.
  delete apiClient.defaults.headers.common.Authorization;
}
