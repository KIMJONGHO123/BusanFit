import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getCurrentUser, login, type CurrentUserResponse, type LoginRequest } from '@/api/auth';
import { apiClient, setAuthorizationToken } from '@/api/client';
import { deleteAccessToken, loadAccessToken, saveAccessToken } from '@/features/auth/token-storage';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

type AuthContextValue = {
  status: AuthStatus;
  user: CurrentUserResponse | null;
  isAuthenticated: boolean;
  signIn: (request: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUserResponse | null>(null);

  const clearSession = useCallback(async () => {
    // 메모리, API 헤더, 기기 저장소에 남아 있는 인증 정보를 한 번에 정리합니다.
    setAuthorizationToken(null);
    setUser(null);
    setStatus('guest');
    await deleteAccessToken();
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      // 앱이 켜질 때 저장된 accessToken을 읽고, 서버의 /me API로 실제 유효성을 확인합니다.
      const token = await loadAccessToken();
      if (!active) return;

      if (!token) {
        setStatus('guest');
        return;
      }

      setAuthorizationToken(token);

      try {
        const currentUser = await getCurrentUser();
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      } catch {
        // 저장된 토큰이 만료됐거나 서버가 거부하면 자동 로그아웃 상태로 돌립니다.
        if (!active) return;
        await clearSession();
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    const interceptorId = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        // 어떤 API에서든 401이 오면 로그인 세션이 더 이상 유효하지 않다고 보고 정리합니다.
        if (error?.response?.status === 401) {
          await clearSession();
          router.replace('/login');
        }

        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, [clearSession]);

  const signIn = useCallback(async (request: LoginRequest) => {
    const response = await login(request);

    // 서버에서 받은 JWT를 저장하고 이후 API 요청 헤더에도 즉시 반영합니다.
    setAuthorizationToken(response.accessToken);
    await saveAccessToken(response.accessToken);
    setUser({
      id: response.id,
      email: response.email,
      nickname: response.nickname,
    });
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    router.replace('/');
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      signIn,
      signOut,
    }),
    [signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
