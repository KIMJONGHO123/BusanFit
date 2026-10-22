# TASK-005 Evidence

상태: **완료 — Codex B 독립 리뷰 APPROVE 및 개발자 최종 확인 완료**.
작업일: 2026-10-23. 웹 개발 환경 구축이며 V2 진단 기능 구현 완료를 의미하지 않는다.

## 1. Task ID

`TASK-005`

## 2. Goal

기존 모바일 앱과 Spring Boot 백엔드를 유지하면서 `apps/web`에 독립적인 React + Vite + TypeScript 개발 환경을 구축한다.
의존성 재설치, 개발 서버, 타입 검사, 정적 분석, 프로덕션 빌드를 검증한다.

## 3. 관련 요구사항

- Expo 모바일 개발은 당분간 보류하고 웹 우선 개발.
- 저장소 구조·AGENTS.md·관련 문서 확인 후 적합한 설정 선택.
- 이번 범위는 개발 환경 구축이며 기존 기능 이식·서버 변경은 포함하지 않음.
- 정상 실행·빌드 검증 및 작업 결과 정리.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md)
- [Architecture](../01-architecture.md), [Rules](../02-diagnosis-rules.md), [Invariants](../03-invariants.md)
- [Roadmap](../08-implementation-roadmap.md), [공통 계약](../09-diagnosis-contract.md)
- [웹 우선 전환 TASK-004](TASK-004.md)
- [Vite 공식 안내](https://vite.dev/guide/)

## 5. 변경 파일

- `apps/web/package.json`, `package-lock.json`: 독립 패키지·잠금 파일, 개발/빌드/미리보기/타입 검사/린트 명령.
- `apps/web/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: 앱·설정 분리와 strict 검사.
- `apps/web/vite.config.ts`: React 플러그인, 로컬 호스트와 고정 포트.
- `apps/web/eslint.config.js`: TypeScript·React Hooks·Fast Refresh 검사.
- `apps/web/index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`: 최소 실행 확인 화면과 진입점.
- `apps/web/.gitignore`: 의존성·빌드 산출물·실제 환경 파일 제외.
- `apps/web/README.md`, 루트 `README.md`: 실행·검증·구조 안내와 웹 개발 경로.
- `docs/V2/docs/evidence/TASK-005.md`: 작업 근거.

## 6. Codex A 주요 판단

### 구현 방식

- 기존 모바일처럼 앱별 npm 패키지 관리 유지. 루트 workspace 도입 없이 웹 전용 잠금 파일 사용.
- Vite 공식 `react-ts` 템플릿으로 시작한 뒤 데모 자산·카운터를 제거하고 최소 시작 화면 구성.
- React 19.3.1 / Vite 7.3.7 / React 플러그인 5.2.0 / TypeScript 6.0.3 / ESLint 10.13.0 설치.
- Node 요구사항은 Vite와 ESLint의 교집합인 `^20.19.0 || ^22.13.0 || >=24`.
- 개발 서버 127.0.0.1:5173, 미리보기 127.0.0.1:4173. 포트 충돌 시 자동 이동 없이 실패하여 실행 주소를 명확히 함.
- 기능이 없는 현 단계에서 라우터·상태 관리·API 라이브러리·환경 변수·프록시는 추가하지 않음. 기능 구조는 실제 구현 시 분리.

### 기존 구조와의 관계 / 구현 전 검증

- 웹 전용 파일과 루트 README만 변경. 기존 모바일·서버·아키텍처 문서 작업 내용은 보존.
- Rule 실행·진단 결과 생성·외부 API 호출 없음. Rule 충돌·지역 Scope 변경·UNKNOWN의 안전 간주 없음.
- 최종 판정 책임을 클라이언트로 옮기지 않으며 공통 진단 계약·시간 계산·검증 상태 정책 변경 없음.

### 구현 중 발견한 문제

- 최신 create-vite 9.3.1의 Vite 8.3.4 조합 설치 중 npm 10.8.2에서 `Cannot read properties of null (reading 'edgesOut')` 발생.
- npm 10.9.4 및 React 플러그인 5.2.0 단독 변경으로도 해소되지 않음. 정확한 근본 원인은 미확정.
- Vite 7.3.7과 플러그인 5.2.0으로 조정한 뒤 기본 npm 명령으로 설치·재설치·빌드 성공. 강제 설치·peer 검증 우회·전역 도구 변경 없음.
- 초기 ESLint 9 설치의 지원 종료 안내를 확인하고, 설치된 Node와 호환되는 ESLint 10으로 구성.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 없음. 웹 환경 구축과 세부 설정 판단은 개발자 요청 범위이며 신규 진단 정책 결정 없음.

### 개발자 결정

- 기존 모바일·백엔드 유지, 웹 환경만 구성하도록 지시함. 이번 Task의 최종 확인·커밋 승인은 아직 없음.

## 8. 자동 검증 결과

검증 환경: Windows PowerShell / Node v20.20.2 / npm 10.8.2.

### Unit Test

- N/A. 비즈니스 로직·상호작용 없는 시작 화면과 도구 설정만 추가. 구현을 반복하는 단위 테스트 대신 빌드·실행 검증 수행.

### Integration Test

- API/DB 통합 테스트 N/A. 서버 연동 코드 변경 없음.
- 실행 스모크 검증 PASS: `npm run dev` 준비 완료 후 Chrome에서 http://127.0.0.1:5173/ 접속, 제목 `BusanFit V2` 및 한국어 안내 렌더링 확인.
- 빌드 스모크 검증 PASS: `npm run preview` 후 http://127.0.0.1:4173/ 에서 같은 화면 렌더링 확인.
- 검증용 개발·미리보기 프로세스는 확인 후 종료함.

### Architecture Test

- 자동 Architecture Test N/A. 서버 의존 관계·진단 Domain 변경 없음.
- 소스 확인: 웹에서 모바일·서버 코드 import 및 외부 API 직접 호출 없음.

### Static Analysis

- `npm ci`: PASS. 웹 잠금 파일로 의존성 재설치 성공.
- `npm run lint`: PASS. ESLint 경고 0.
- `npm run typecheck`: PASS. TypeScript 프로젝트 검사.
- `npm run build`: PASS. TypeScript 검사 및 Vite 프로덕션 빌드, `dist/` 생성.
- `npm ls --depth=0`: PASS. 의존성 오류 없음.
- npm 설치 감사 결과: 취약점 0건.
- `git check-ignore node_modules dist .env .env.production`: PASS(웹 디렉터리 기준).
- 문서 로컬 링크·후행 공백 및 `git diff --check` 확인.

## 9. Evaluation 결과

- 실행 Case: N/A. 진단 엔진·Rule·계약 동작 변경 없는 개발 환경 구축.
- 기존 Evaluation의 통과 또는 구현 완료를 주장하지 않음.

## 10. Codex B Review

- 출처: 2026-10-23 개발자가 전달한 별도 Codex B 세션의 실제 독립 리뷰 결과. Codex A 자체 검토가 아님.
- 요구사항: 독립적인 React + Vite + TypeScript 환경 구성 확인. 필수 수정 사항 없음.
- Rule / Architecture / 불변조건: 진단 로직·서버 책임·핵심 불변조건에 영향 없음.
- 검증: 린트·타입 검사·프로덕션 빌드·의존성 검사 통과.
- 실행 확인: 개발 서버와 빌드 미리보기의 HTTP 200 응답 확인.
- 테스트 / Evaluation: N/A 사유가 타당함.
- 리뷰의 검증 범위: 브라우저 렌더링과 `npm ci`는 이번 Codex B 리뷰에서 재실행하지 않음. 8절의 Codex A 검증 기록과 구분함.
- Codex B는 소스·문서를 수정하지 않았으며 개발자 최종 확인이 남아 있음을 명시함.
- Review Result: **APPROVE**.

## 11. Review 이후 수정사항

- 필수 수정 요청 없음. 전달받은 독립 리뷰 결과·검증 범위와 개발자 최종 확인 대기 상태만 Evidence에 반영함.
- 2026-10-23 개발자가 최종 확인 후 커밋만 지시함. 완료 상태와 커밋 범위를 기록하며 푸시는 수행하지 않음.

## 12. 최종 검증 결과

- [x] 요구된 웹 개발 환경 구축
- [x] 잠금 파일 기반 재설치·타입 검사·ESLint·프로덕션 빌드
- [x] 개발 서버 및 빌드 미리보기 Chrome 렌더링 확인
- [x] Invariant Check — 판정 생성·정책 변경 없음
- Unit / API Integration / 자동 Architecture / Evaluation: N/A(위 사유 참조).
- [x] Codex B Review — 개발자가 실제 APPROVE 결과 전달
- [x] Developer Final Check — 2026-10-23 개발자 최종 확인 및 커밋 승인

## 13. Commit

- Commit Hash: 이 문서를 포함하는 커밋의 Git 이력 참조.
- Commit Message: `chore: set up React web development environment (TASK-005)`
- 개발자 승인 범위는 커밋까지. Merge / Push 수행하지 않음.
