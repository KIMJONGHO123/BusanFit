// TanStack Query의 전역 QueryClient를 생성하는 파일입니다.
import { QueryClient } from '@tanstack/react-query';

// QueryClient는 서버 데이터와 요청 상태를 실제로 관리하는 관리자입니다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
    },
  },
});
