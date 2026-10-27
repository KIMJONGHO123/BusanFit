# BusanFit V2 웹

React + Vite + TypeScript 기반의 웹입니다. 관광지 검색·선택, 일정 편집, 로그인·회원가입과 V2 일정 진단을 제공합니다. 장소를 고른 뒤 ‘순서·시간 설정’에서 여행 조건·활동·최종 체류시간을 입력하고 **진단하기**를 누릅니다. 로그인 후 서버의 일정 판정·검증 상태·예상 일정·확인 한계·구간 경로를 확인하고 수정·재진단할 수 있습니다. 홈·저장 일정·지리적 배경이 있는 지도는 후속 작업입니다.

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
- `src/App.tsx`: 검색/편집/결과 화면 전환과 일정·로그인·진단 스냅샷의 메모리 상태.
- `src/features/places/`: 검색 API 응답 검증, 장소 검색·선택 화면, 사진 컴포넌트.
- `src/features/planner/`: 일정 편집, 출발지 검색, 서버 활동 정책 조회·검증, 입력 검사·V2 요청.
- `src/features/auth/`: 기존 회원가입·로그인 API와 연결한 dialog. 토큰·비밀번호를 브라우저 저장소에 보관하지 않습니다.
- `src/features/diagnosis/`: V2 응답 검증, 판정/검증 상태·예상 일정·근거·경로 미리보기.
- `src/components/Icon.tsx`: 공통 아이콘.
- `src/index.css`: Cal.com 기반 중립색·타이포그래피·반응형 스타일.
- `tests/places.spec.ts`: 응답 검증 단위 테스트와 Chrome 데스크톱·모바일 에뮬레이션 테스트, axe 접근성 검사.
- `tests/planner.spec.ts`: 활동·체류시간·계약 입력 단위 검사, 화면 왕복·순서·삭제·정책 실패/변경·출발지·입력 오류·반응형 통합 검사.
- `tests/diagnosis.spec.ts`: 진단 계약·로그인·실패·만료·중복 요청·재진단·검증 상태 노출·접근성 검사.
- `tests/diagnosis-live.spec.ts`: 명시적으로 활성화하는 별도 H2 서버의 실제 브라우저→TourAPI→TMAP 진단 검증. 기본 실행에서는 건너뜁니다.
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

선택한 장소·일정·로그인·결과는 React 메모리에 유지되며 새로고침하면 초기화됩니다. ‘입력 확인’은 형식만 검사하는 보조 버튼입니다. **진단하기**는 입력 검사 후 필요 시 로그인 화면을 열고 `POST /api/v2/planner/diagnose`에 Bearer 토큰과 최종 계획시간을 전송합니다. DB에 일정을 저장하지 않습니다. [공통 계약](../../docs/V2/docs/09-diagnosis-contract.md)에 따라 판정과 검증 상태·시간 계산은 서버 책임입니다.

- 로그인/가입: 기존 `POST /api/user/login`, `POST /api/user/signup` 사용. 비밀번호는 요청 중 입력 상태에만 두고 모달 종료 시 제거합니다. 토큰은 App 메모리에서만 유지합니다.
- 요청 중에는 입력·중복 제출을 막습니다. 화면을 떠나면 진행 요청을 취소하며 늦게 온 응답으로 화면을 바꾸지 않습니다. 서버 401은 재로그인을 안내하고, 다른 오류·잘못된 응답·120초 초과는 입력을 보존한 실패 상태로 표시합니다. 자동 재진단이나 임의 결과 대체는 하지 않습니다.
- 결과 상단에 일정 판정과 전체/일부 확인·확인 불가를 함께 표시합니다. 미확인 시간은 ‘계산 불가’이며 0으로 표시하지 않습니다. 확인된 조정 필요와 미확인 정보는 함께 유지합니다.
- 경로 미리보기는 `schedule.segments`의 확인된 경로 좌표만 SVG로 표시합니다. 배경 지도·지도 타일·길찾기를 새로 조회하지 않으며 일정의 이동시간과 동일한 진단 스냅샷입니다. 미확인 구간의 연결선을 만들지 않습니다.
- 서버는 기존 Expo 주소와 Vite 개발 주소 `http://127.0.0.1:5173`, `http://localhost:5173`을 명시적으로 허용합니다. 다른 배포 주소는 서버 `app.cors.allowed-origins`에 명시적으로 설정합니다. 진단의 로그인 요구는 유지합니다.

### 실제 브라우저 진단 검증

개발 DB에 테스트 계정을 남기지 않도록 고정 H2 서버·별도 Vite 포트를 사용합니다. 실제 API 키는 기존 서버 비공개 설정 또는 환경 변수에서 읽으며 웹에 전달하지 않습니다.

서버 터미널:

```powershell
cd C:\BusanFit\apps\server
$env:BUSANFIT_LIVE_WEB_DIAGNOSIS = '1'
.\gradlew.bat diagnosisWebTestServer
```

웹 테스트 터미널:

```powershell
cd C:\BusanFit\apps\web
$env:BUSANFIT_API_TARGET = 'http://127.0.0.1:18080'
$env:BUSANFIT_WEB_BASE_URL = 'http://127.0.0.1:5174'
$env:BUSANFIT_WEB_PORT = '5174'
$env:BUSANFIT_LIVE_WEB_DIAGNOSIS = '1'
npx playwright test tests/diagnosis-live.spec.ts --workers=1
```

테스트는 PC·모바일 브라우저 에뮬레이션에서 실제 검색·가입·로그인·진단·수정·재진단을 확인합니다. 가입 데이터는 테스트 H2 메모리에만 저장되며 서버 종료 시 사라집니다. 종료 후 이 터미널들을 닫으면 활성화 환경변수도 제거됩니다. 기본 웹 주소와 API target은 여전히 5173/8080이며 `BUSANFIT_API_TARGET`, `BUSANFIT_WEB_PORT`는 Vite 서버 설정용입니다.

- [웹 진단 연결 근거 TASK-012](../../docs/V2/docs/evidence/TASK-012.md)

### 일정 입력과 활동 정책

- `GET /api/planner/activity-policy`: 비로그인 조회 가능. 기존 서버 `ActivityType`의 일반 활동시간을 초 단위로 제공합니다. 항목은 `code`, `label`, `durationSeconds`, `customDurationRequired`입니다. 휴식(`rest`)·기타(`other`)는 `durationSeconds: null`, `customDurationRequired: true`이며 각 활동을 선택한 뒤 양의 정수 분을 직접 입력합니다. 휴식의 초기 입력은 빈 값이며 20분을 자동 적용하지 않습니다. 기존 V1 진단의 REST 20분·OTHER 30분 로직은 유지하며, V2 진단은 사용자가 지정한 시간을 검증·사용합니다.
- 정책 조회 중/실패/잘못된 응답/15초 초과를 표시하며 클라이언트 고정 시간표로 대체하지 않습니다. 실패 시 다시 불러올 수 있습니다.
- 활동 선택·해제와 휴식·기타 활동시간 변경 시 확인한 활동 합계를 ‘머무를 시간’에 자동 입력합니다. 카페 40분+식사 60분+쇼핑 50분+사용자가 입력한 휴식 20분이면 170분입니다. 휴식시간은 활동 합계에 한 번만 포함하며 별도 추가 여유시간을 더하지 않습니다.
- 자동 입력 후 직접 수정할 수 있습니다. 이후 활동 또는 휴식·기타 활동시간을 바꾸면 수동 입력값도 새 합계로 갱신하며 화면에 안내합니다. 활동을 모두 해제하거나 선택 활동시간이 불완전하면 자동 입력은 비웁니다. 휴식·기타가 선택된 상태의 빈 값/0/음수/소수는 오류이며 임의 시간으로 대체하지 않습니다. 활동 없이 직접 양의 머무를 시간을 입력하는 것도 가능합니다. 현재 서버 활동시간은 분 단위이며 정확한 정수 분으로 변환할 수 없는 합계를 임의로 반올림해 자동 입력하지 않습니다.
- 화면 왕복·순서 변경 시 수동/자동 입력을 유지합니다. 서버 정책시간 변경만으로 기존 입력을 덮어쓰지 않으며 현재 활동시간과 변경 안내를 함께 표시합니다. 별도 확인 체크박스 없이 입력 검사를 진행할 수 있습니다.
- ‘머무를 시간’은 활동과 휴식을 포함한 최종 `plannedStaySeconds`입니다. 서버 일정 계산에서 활동시간을 추가 합산하지 않습니다. 자동 입력은 선택 활동 기준의 계획이며, 근거 없는 장소별 기본 권장시간을 포함하지 않습니다. 활동시간보다 짧게 직접 수정해도 입력을 막거나 진단 판정을 생성하지 않습니다.
- ‘방문시간 지정’은 기본적으로 꺼져 있으며 켜면 방문 시각을 입력합니다. 켠 상태의 빈 시각이나 여행 시간 범위 밖 시각은 오류입니다. 끄면 기존 시각을 지우고 요청 변환에서 `plannedVisitTime`을 제외하여 자동 배치로 돌아갑니다. 켠 상태와 시각은 화면 왕복·순서 변경 시 장소별로 유지됩니다.
- 출발지는 기존 기본값 부산역 또는 실제 관광지 검색 결과에서 고릅니다. 출발지 검색은 첫 페이지 최대 20개만 제공하며 일반 주소 검색이 아닙니다. 빈 결과/실패를 구분하고 기존 출발지는 유지합니다.
- 날짜·같은 날 시작/종료 순서·지정 방문시간의 입력/범위·양의 정수 시간·활동 중복을 검사합니다. 이동시간·예상 도착·잔여시간·일정 충돌 판단은 서버 진단 연결 후 제공합니다.
- PC는 세로 일정과 오른쪽 여행 조건/요약, 모바일은 여행 조건→일정→요약 순서입니다. 순서 변경은 키보드로도 가능한 위/아래 버튼을 사용합니다.

테스트는 설치된 Google Chrome을 사용합니다. 기본 회귀 테스트는 테스트 내부에서 합성 API 응답을 주입하며 실제 TourAPI 통합 성공과 구분합니다. `npm test`는 기존 5173 개발 서버를 재사용하거나 직접 시작하고, 실제 API 테스트는 기본적으로 건너뜁니다. 캡처는 `test-results/`에 생성되며 `*-fixture.png`는 테스트 데이터 화면입니다. 모바일은 Chromium 에뮬레이션으로, 실제 iOS Safari 검증과 다릅니다.

### 실제 TourAPI 검증

먼저 [서버 실행 문서](../server/README.md)에 따라 MySQL과 Spring Boot 서버를 실행합니다. 서버의 실제 TourAPI 인증키가 필요하며, 웹에는 키를 넣지 않습니다.

```powershell
cd C:\BusanFit\apps\web
$env:BUSANFIT_LIVE_TOURAPI = '1'
try {
  npx playwright test tests/tourapi-live.spec.ts --workers=1
} finally {
  Remove-Item Env:BUSANFIT_LIVE_TOURAPI -ErrorAction SilentlyContinue
}
```

`tests/tourapi-live.spec.ts`는 응답 가로채기나 테스트 데이터 대체 없이 실제 웹→서버→TourAPI를 검증합니다. 해운대 검색·상세·선택·일정 편집·실제 활동 정책·화면 왕복 입력 유지와 부산 목록·빈 검색을 확인합니다. 감천문화마을 검색과 7페이지 결과로 법정동 지역 필터의 회귀도 검증합니다. API 호출량을 줄이기 위해 한 worker로 실행합니다. 실패하면 실제 환경의 실패로 보고하며 mock으로 대체하지 않습니다.

2026-10-26 TASK-010에서 부산 지역 조건을 `lDongRegnCd=26`으로 교체한 뒤, 실제 API 6건을 포함한 전체 브라우저 테스트 54건이 통과했습니다. 초기 검증이 놓친 감천문화마을 누락과 후속 수정 내용은 TASK-010 Evidence에 기록합니다. `*-tourapi-live-*.png`는 실제 응답 화면입니다. 이 성공은 장소 검색과 일정 입력 흐름의 검증이며, 운영시간·권장 체류시간의 검증이나 V2 진단 성공을 의미하지 않습니다.

`.env` 및 환경별 `.env.*`는 Git에서 제외합니다(`.env.example`만 추적 가능). Vite의 `VITE_` 변수는 브라우저에 공개되므로 외부 API 비밀키를 넣지 않습니다. 실제 연동에 필요한 환경 변수와 배포 설정은 해당 작업에서 정의합니다.

- [프로젝트 지침](../../AGENTS.md)
- [아키텍처](../../docs/V2/docs/01-architecture.md)
- [불변조건](../../docs/V2/docs/03-invariants.md)
- [작업 근거 TASK-005](../../docs/V2/docs/evidence/TASK-005.md)
- [일정·활동 편집 TASK-007](../../docs/V2/docs/evidence/TASK-007.md)
- [실제 TourAPI 연동 검증 TASK-010](../../docs/V2/docs/evidence/TASK-010.md)
- [Vite 공식 시작 안내](https://vite.dev/guide/)
