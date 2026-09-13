import { isAxiosError } from 'axios';

import { apiClient } from '@/api/client';

// 서버의 회원가입 요청/응답 JSON 구조와 맞춘 타입입니다.
export type SignupRequest = { email: string; password: string; nickname: string };
export type SignupResponse = { message: string; id: number; nickname: string };

// 로그인 성공 시 서버가 JWT accessToken과 사용자 기본 정보를 함께 내려줍니다.
export type LoginRequest = { email: string; password: string };
export type LoginResponse = {
  message: string;
  id: number;
  email: string;
  nickname: string;
  tokenType: string;
  accessToken: string;
  expiresIn: number;
};

// 저장된 토큰이 아직 유효한지 확인할 때 /api/user/me 응답으로 사용하는 타입입니다.
export type CurrentUserResponse = { id: number; email: string; nickname: string };

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const response = await apiClient.post<SignupResponse>('/api/user/signup', request);
  return response.data;
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/user/login', request);
  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>('/api/user/me');
  return response.data;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;

  // 서버 예외가 문자열 또는 { message } 형태로 올 수 있어 두 경우를 모두 처리합니다.
  const data: unknown = error.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  if (!error.response) {
    return '서버에 연결할 수 없습니다. 네트워크와 API 주소를 확인해 주세요.';
  }

  return fallback;
}
