# BusanFit V2 웹

React + Vite + TypeScript 기반의 웹입니다. 현재 구현 범위는 관광지 검색·상세 확인·장소 선택/해제 화면입니다. 순서·시간 편집, 진단, 지도, 홈·저장 일정은 후속 화면 승인 후 구현합니다.

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
npm test
npm run preview
```

빌드 결과는 `dist/`, 빌드 미리보기는 http://127.0.0.1:4173/ 입니다. 서버는 Ctrl+C로 종료합니다. 포트가 사용 중이면 다른 포트로 자동 변경하지 않고 오류를 표시합니다. 필요하면 `npm run dev -- --port 5174`처럼 포트를 지정합니다.

저장소 루트에서도 `npm --prefix apps/web run dev` 등을 사용할 수 있습니다.

## 구조와 설정

- `src/main.tsx`: React StrictMode와 앱 진입점.
- `src/App.tsx`: 관광지 검색 화면 진입점.
- `src/features/places/`: 검색 API 응답 검증, 장소 검색·선택 화면, 사진 컴포넌트.
- `src/components/Icon.tsx`: 공통 아이콘.
- `src/index.css`: Cal.com 기반 중립색·타이포그래피·반응형 스타일.
- `tests/places.spec.ts`: 응답 검증 단위 테스트와 Chrome 데스크톱·모바일 에뮬레이션 테스트, axe 접근성 검사.
- `index.html`: 한국어 문서와 페이지 제목.
- `vite.config.ts`: React 플러그인과 로컬 개발·미리보기 서버 설정.
- `tsconfig*.json`: 앱·설정 파일을 분리하고 strict 타입 검사 적용.
- `eslint.config.js`: TypeScript, React Hooks, Fast Refresh 검사.
- `package-lock.json`: 웹 전용 의존성 잠금 파일. 재설치는 `npm ci` 사용.

Vite 공식 React·TypeScript 템플릿을 기반으로 구성했습니다. Vite 8 계열은 현재 npm 환경에서 의존성 해석 오류가 발생하여, 설치·빌드가 확인된 Vite 7.3.7과 React 플러그인 5.2.0을 사용합니다. ESLint는 10 계열입니다.

현재 저장소처럼 앱별 패키지 관리를 유지합니다. 루트 workspace 및 모바일 의존성은 변경하지 않습니다. 라우터·상태 관리·API 클라이언트는 실제 기능 구현 시 필요한 범위에서 추가합니다. 기능 코드는 이후 `src/features/`, 공통 코드는 `src/shared/` 등으로 필요할 때 분리합니다.

## 서버 연결과 개발 규칙

검색 API는 페이지 메타데이터 없이 필터링된 배열만 반환합니다. 따라서 표시 결과가 20개 미만이거나 0개여도 마지막 페이지로 판단하지 않고 ‘다음’ 탐색을 허용합니다. 빈 응답은 현재 페이지에 표시할 장소가 없다는 뜻으로 안내합니다. 전체 페이지 수와 마지막 페이지는 현재 계약에서 확인할 수 없으며, 실제 끝을 넘어 빈 페이지를 조회할 수도 있습니다. 탐색은 사용자가 버튼을 누를 때만 실행합니다.

개발 서버는 `/api`를 `http://127.0.0.1:8080`으로 프록시합니다. 검색은 기존 `GET /api/places/search?keyword=...&page=...&size=20` 계약을 사용합니다. 실제 검색에는 기존 Spring Boot 서버·DB·TourAPI 서버 설정이 필요합니다. 정적 배포/`npm run preview`에는 이 개발 프록시가 없으므로 검색하려면 같은 출처의 `/api` 역방향 프록시를 별도 구성해야 합니다.

백엔드 없이 초기 화면을 볼 수 있으며 검색 시 연결 실패를 표시합니다. 앱은 mock 장소로 자동 대체하지 않습니다. 성공 응답의 빈 배열은 결과 없음, HTTP/네트워크/응답 형식 오류와 15초 초과는 검색 실패로 표시합니다. 기존 서버 검색 범위는 부산입니다. 기본 90분은 장소별 권장 근거가 없어 노출하지 않고, 운영시간·권장 체류시간은 확인 불가로 표시합니다.

선택한 장소는 React 메모리에만 유지되며 새로고침하면 초기화됩니다. DB 저장 완료나 V2 진단 연동 완료를 의미하지 않습니다. 다음 화면 버튼은 설명과 함께 비활성화되어 있습니다. [공통 계약](../../docs/V2/docs/09-diagnosis-contract.md)에 따라 판정은 서버 책임으로 유지합니다.

테스트는 설치된 Google Chrome을 사용합니다. 테스트 내부에서만 합성 API 응답을 주입하며 실제 TourAPI 통합 성공을 검증하지 않습니다. `npm test`는 기존 5173 개발 서버를 재사용하거나 직접 시작합니다. 캡처는 `test-results/`에 생성되며 `*-fixture.png`는 테스트 데이터 화면입니다. 모바일은 Chromium 에뮬레이션으로, 실제 iOS Safari 검증과 다릅니다.

`.env` 및 환경별 `.env.*`는 Git에서 제외합니다(`.env.example`만 추적 가능). Vite의 `VITE_` 변수는 브라우저에 공개되므로 외부 API 비밀키를 넣지 않습니다. 실제 연동에 필요한 환경 변수와 배포 설정은 해당 작업에서 정의합니다.

- [프로젝트 지침](../../AGENTS.md)
- [아키텍처](../../docs/V2/docs/01-architecture.md)
- [불변조건](../../docs/V2/docs/03-invariants.md)
- [작업 근거 TASK-005](../../docs/V2/docs/evidence/TASK-005.md)
- [Vite 공식 시작 안내](https://vite.dev/guide/)
