# BusanFit V2 웹

React + Vite + TypeScript 기반의 웹 개발 환경입니다. 현재는 실행 확인용 시작 화면만 있으며, 일정 입력·진단·지도·백엔드 연결은 후속 작업입니다.

## 실행

Node.js `^20.19.0 || ^22.13.0 || >=24`와 npm이 필요합니다. 현재 검증 환경은 Node 20.20.2 / npm 10.8.2입니다.

```powershell
cd C:\BusanFit\apps\web
npm ci
npm run dev
```

개발 서버: http://127.0.0.1:5173/

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
```

빌드 결과는 `dist/`, 빌드 미리보기는 http://127.0.0.1:4173/ 입니다. 서버는 Ctrl+C로 종료합니다. 포트가 사용 중이면 다른 포트로 자동 변경하지 않고 오류를 표시합니다. 필요하면 `npm run dev -- --port 5174`처럼 포트를 지정합니다.

저장소 루트에서도 `npm --prefix apps/web run dev` 등을 사용할 수 있습니다.

## 구조와 설정

- `src/main.tsx`: React StrictMode와 앱 진입점.
- `src/App.tsx`: 실행 확인용 시작 화면.
- `src/index.css`: 최소 전역 스타일.
- `index.html`: 한국어 문서와 페이지 제목.
- `vite.config.ts`: React 플러그인과 로컬 개발·미리보기 서버 설정.
- `tsconfig*.json`: 앱·설정 파일을 분리하고 strict 타입 검사 적용.
- `eslint.config.js`: TypeScript, React Hooks, Fast Refresh 검사.
- `package-lock.json`: 웹 전용 의존성 잠금 파일. 재설치는 `npm ci` 사용.

Vite 공식 React·TypeScript 템플릿을 기반으로 구성했습니다. Vite 8 계열은 현재 npm 환경에서 의존성 해석 오류가 발생하여, 설치·빌드가 확인된 Vite 7.3.7과 React 플러그인 5.2.0을 사용합니다. ESLint는 10 계열입니다.

현재 저장소처럼 앱별 패키지 관리를 유지합니다. 루트 workspace 및 모바일 의존성은 변경하지 않습니다. 라우터·상태 관리·API 클라이언트는 실제 기능 구현 시 필요한 범위에서 추가합니다. 기능 코드는 이후 `src/features/`, 공통 코드는 `src/shared/` 등으로 필요할 때 분리합니다.

## 서버 연결과 개발 규칙

현재 API 호출·프록시·목업 진단은 없습니다. 시작 화면은 백엔드 실행 없이 확인할 수 있습니다. API 연동 시 [공통 계약](../../docs/V2/docs/09-diagnosis-contract.md)을 따르고, 최종 판단은 서버 Diagnosis Domain에 둡니다.

`.env` 및 환경별 `.env.*`는 Git에서 제외합니다(`.env.example`만 추적 가능). Vite의 `VITE_` 변수는 브라우저에 공개되므로 외부 API 비밀키를 넣지 않습니다. 실제 연동에 필요한 환경 변수와 배포 설정은 해당 작업에서 정의합니다.

- [프로젝트 지침](../../AGENTS.md)
- [아키텍처](../../docs/V2/docs/01-architecture.md)
- [불변조건](../../docs/V2/docs/03-invariants.md)
- [작업 근거 TASK-005](../../docs/V2/docs/evidence/TASK-005.md)
- [Vite 공식 시작 안내](https://vite.dev/guide/)
