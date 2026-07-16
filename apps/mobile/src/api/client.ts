// 백엔드 API 요청에 사용할 Axios 기본 클라이언트 파일입니다.
import axios from 'axios';

// Spring Boot API가 연결되면 이 인스턴스를 기준으로 요청 함수를 만들 예정입니다.
export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});
