# TASK-015 Evidence

상태: **완료 — Codex B 독립 리뷰 APPROVE 및 개발자 최종 확인 완료, TASK-015 Commit 승인 수신**.
작업일: 2026-10-28. 개발자가 TASK-015의 실제 독립 리뷰 결과를 전달했고 최종 확인·커밋을 승인했다. Merge·Push 승인은 포함하지 않는다.

## 1. Task ID

`TASK-015`

## 2. Goal

TMAP 지도에서 도착지 번호를 선택하면 해당 장소까지의 이동시간 한 개를 보여준다. 시간은 장소명과 붙이지 않고 지도 아래 독립된 패널에 표시해 가독성을 유지한다.

## 3. 관련 요구사항

- 개발자가 TMAP을 유지하면서 선택한 구간의 이동시간을 표시하는 1번 방안을 승인했다. 기존 목적지 이름과 너무 붙이지 않고 가독성 있게 구성하도록 요청했다.
- 장소 번호 클릭/터치와 키보드 구간 선택이 같은 구간을 가리켜야 한다.
- 시간은 같은 진단의 서버 초 값을 표시한다. 별도 길찾기·진단 호출·시간 재계산·분 올림 없음.
- 미확인 구간은 확인 불가로 남긴다. 재진단 후 이전 선택·시간이 남지 않게 한다.
- 선행 TASK-014 미커밋 변경과 실제 리뷰 기록을 보존한다.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md), [Architecture](../01-architecture.md), [Rules](../02-diagnosis-rules.md).
- [Invariants](../03-invariants.md): INV-001/004/005/009와 기존 판단 경계.
- [공통 계약](../09-diagnosis-contract.md) 5절: 지도·결과의 동일 진단 스냅샷.
- [Evaluation](../06-evaluation-set.md): EVAL-310, EVAL-205.
- [TASK-014](TASK-014.md): 실제 지도 구현과 독립 리뷰 기록.
- [PamPam 참고 화면](https://refero.design/pages/ec262ecb-b082-47cc-bc6b-6e1670057e71): 경로/이동시간 계층. 현재 BusanFit UI와 개발자 가독성 요구를 우선 적용한다.
- [TMAP 공식 가이드](https://tmapapi.tmapmobility.com/main.html): Marker 이벤트, Polyline.setColorOptions, Map.getCenter. 모바일 이벤트 차이는 공식 제공 JS V2 코드에서도 확인했다.

## 5. 변경 파일

- `apps/web/src/features/diagnosis/route-map.ts`: 동일 진단의 구간명·초 값 전달, 마커 클릭/터치 이벤트, 선택 경로·번호 강조, 중복 SDK 제목 툴팁 제거.
- `apps/web/src/features/diagnosis/RouteMap.tsx`: 현재 프레임 메시지·구간 ID 검증, 선택 상태, 접근 가능한 구간 목록, 별도 시간 패널, 재시도 시 선택 재적용.
- `apps/web/src/index.css`: 지도와 시간 패널 사이 16px 간격, 선택 목록·시간·구간명의 별도 계층, 긴 이름 줄바꿈.
- `apps/web/tests/map-fixtures.ts`: 테스트 전용 SDK의 선택 이벤트·경로 스타일 검증 지원.
- `apps/web/tests/route-leg-fixtures.ts`: 3구간·긴 이름·미확인 중간 구간의 명시적 합성 응답.
- `apps/web/tests/diagnosis-helpers.ts`: 여러 장소 입력을 준비할 수 있도록 테스트 헬퍼 확장.
- `apps/web/tests/route-map.spec.ts`: 단위·선택/강조·키보드·미확인·재진단/재시도·실제 SDK 회귀.
- `apps/web/tests/diagnosis-live.spec.ts`: 실제 진단의 구간 초 값과 표시 대조, PC 클릭·모바일 탭·선택 초기화 검증.
- `apps/web/README.md`, 본 Evidence, `assets/TASK-015/` 캡처 4개.
- `TASK-014.md`: 기존 APPROVE가 TASK-015 추가 변경을 포함하지 않는다는 범위 안내만 추가.

## 6. Codex A 주요 판단

### 구현 전 검증 / 기존 구조

- 시간 계산·판정·검증 상태·Rule/Registry/지역 Scope·Port/Adapter·서버 계약은 변경하지 않는다. 화면에서 이미 받은 구간 `route.value.seconds`만 기존 `formatDuration`으로 표시한다.
- 표시용 구간 목록에는 미확인 구간도 `seconds: null`로 남긴다. 지도 선은 기존처럼 확인된 좌표만 포함한다. 검색 Snapshot은 이름에만 사용하고 경로·시간 근거로 사용하지 않는다.
- 미확인 구간의 도착지 좌표가 이후 확인된 구간의 출발점으로 존재하면 그 번호 선택도 가능하지만, 해당 유입 구간의 시간은 확인 불가로 표시한다. 이후 확인된 구간의 초 값은 별도로 표시한다.
- 전체 경로가 미확인인 경우 기존의 지도 없음 안내를 유지한다. 판정·검증 상태는 서버 결과 그대로다.

### 디자인 기준과 결정 기록

기존 Refero 디자인 스킬·PamPam 참고와 승인된 BusanFit UI를 유지하는 직접 구현이다. 새 시각 방향 탐색이나 이미지 생성은 N/A.

| 결정 | 근거 / 역할 | 구현 |
|---|---|---|
| 장소명과 시간을 공간적으로 분리 | 개발자 가독성 요구, 기존 지도 이름 레이블 | 지도 아래 16px 간격의 독립 패널. 지도 위 시간 팝업 없음 |
| 한 번에 선택한 시간 한 개만 표시 | 승인된 선택 구간 방안 | 번호 클릭/터치 또는 구간 목록 → 같은 단일 패널 |
| 선택 번호와 경로에 기존 파랑 사용 | PamPam 경로 계층, TASK-014 파랑의 경로 역할 | 선택 선 8px·선택 번호 파랑, 다른 확인된 선 4px·차분한 파랑 |
| 시간·구간명·선택 조작을 서로 구분 | 기존 UI 계층과 Refero 접근성 craft | 시간 20px, 이름은 별도 줄, 키보드용 native select·aria-live 안내 |
| 번호 44px, 지도 조작 여백 확대 | 모바일 터치와 기존 장소명 유지 | 마커 높이·fitBounds 상단 여백 조정 |

### 상태·오류·보호

- 지도 문서는 선택된 ID만 부모에게 알린다. 부모는 현재 iframe Window·기존 허용 출처/채널·실제 응답에 포함된 구간 ID를 검증한다.
- 부모는 선택 ID를 현재 프레임으로 보내고, 프레임은 부모 Window·채널·구간 ID를 확인해 선과 번호만 갱신한다. 선택으로 SDK 부트스트랩·진단·길찾기를 다시 요청하지 않는다.
- 재진단은 기존 diagnosisId 기반 컴포넌트 교체로 선택을 초기화한다. 지도만 재시도할 때는 서버 초 값과 선택을 유지하고 준비된 새 프레임에 강조를 재적용한다.
- 장소명은 기존 안전한 script 직렬화·HTML 이스케이프를 유지한다. 패널의 이름은 React 텍스트로 출력한다. 키·계정·서버 외부 응답 저장 변경 없음.

### 자체 검증에서 발견한 문제

- 실제 모바일 SDK에서 desktop click 이벤트만으로는 탭 선택이 발생하지 않았다. SDK의 touchstart/touchend 이벤트도 연결하고 지도 중심이 이동한 제스처는 선택으로 처리하지 않도록 보완했다. 실제 모바일 탭 재검증 PASS.
- PC 캡처에서 SDK 기본 제목 툴팁이 상시 장소명 레이블과 중복 표시됐다. 중복 제목을 제거하고 상시 이름·선택 패널의 전체 구간명은 유지했다. 마지막 수정 후 관련 검증과 캡처를 갱신했다.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 추가 정책 결정 없음. 시간 표시·선택 UI만 추가하며 기존 판정 정책이나 시간 반올림 기준을 만들지 않는다.

### 개발자 결정

- “1번으로 진행” 및 장소명과 떨어진 가독성 있는 구성을 명시적으로 승인했다.
- TASK-014의 APPROVE는 기존 구현에 대한 리뷰로 구분했다. 이후 TASK-015의 실제 독립 리뷰 APPROVE를 전달받았고, 2026-10-28 개발자가 문제가 없음을 확인하며 TASK-015 커밋까지 명시적으로 승인했다. 병합·푸시는 포함하지 않는다.

## 8. 자동 검증 결과

### Unit Test

- 기존 순수 함수 2종의 검증을 확장했다. 같은 좌표·초 값 보존, 순서·구간명, 미확인 null 유지, 이후 구간 독립성, 안전한 직렬화 PASS.
- 테스트의 합성 응답·SDK는 제품 코드에 포함되지 않는다.

### Integration Test

- 전체 웹: **92건 중 86 passed / 6 skipped, 실패 0, 44.7초**.
- 명령: 격리 H2 18080과 별도 Vite 5174에서 `BUSANFIT_LIVE_WEB_DIAGNOSIS=1`, `BUSANFIT_LIVE_MAP=1`, `BUSANFIT_API_TARGET=http://127.0.0.1:18080`, `BUSANFIT_WEB_BASE_URL=http://127.0.0.1:5174`, `BUSANFIT_WEB_PORT=5174`를 설정하고 `npm test -- --workers=2`.
- 6 skipped는 별도 검색 전용 `BUSANFIT_LIVE_TOURAPI` 시나리오 미활성화다. 실제 진단 흐름에서는 TourAPI 검색·상세도 호출했다.
- 마지막 중복 제목 툴팁 제거 후 `npx playwright test tests/route-map.spec.ts tests/diagnosis-live.spec.ts --workers=2`: **16 passed, 16.2초**, 실패 0. 같은 격리 환경에서 지도 관련 전체와 실제 진단을 재검증했다. 나머지 웹 회귀는 앞선 전체 결과와 구분한다.
- 실제 API 2건: PC·모바일 실제 검색·가입/로그인·TourAPI 상세·TMAP 경로·SDK/타일 → 마커 클릭/탭 → `formatDuration(서버 구간 seconds)`와 표시값 대조 → 수정·재진단 후 이전 선택/시간 제거 PASS. 외부 응답 대역 없음. 조회값은 시점에 따라 변하므로 고정 수치로 기대하지 않는다.
- 실제 SDK 2건: 진단 응답은 명시적 합성 데이터, SDK/타일은 실제. 클릭/탭과 부모 패널 연결·선택 번호 표시·장소명/조작부 배치 PASS. 실제 경로 API 검증과 구분한다.
- 3구간 합성 회귀: 번호/키보드 선택 전환, 한 개의 정확한 시간, 선택 선 스타일, 요청 1회 유지, 긴 장소명·가로 넘침 없음 PASS. 미확인 중간 구간은 확인 불가, 이후 구간은 정확한 초 표시, 선은 2개만 유지 PASS.
- 기존 SDK 오류·재시도 회귀에 지도 장애 중 시간 확인과 재시도 후 선택 재적용을 추가해 PASS. 재진단은 선택 초기화·새 좌표·새 61초 표시를 확인했다.
- 계정은 테스트 H2 `diagnosis_web`에만 생성했다. 개발 MySQL·8080 서버는 수정하지 않았다. 테스트 18080/5174는 종료하고 기존 5173 개발 서버를 유지했다.

### Architecture Test

- 서버 `.\gradlew.bat check` 성공. 모든 태스크 **UP-TO-DATE**로 새 테스트 실행은 아니다. 서버/Domain/의존성 변경 없음. 새 서버 Architecture 검증 추가는 N/A.

### Static Analysis

- 마지막 코드의 `npm run typecheck`, `npm run lint`, `npm run build` PASS.
- 새 선택 패널과 기존 진단·로그인 흐름의 axe WCAG 2A/AA·2.1AA 자동 검사 PASS. 실제 iOS Safari·수동 스크린리더 검증은 N/A이며 Chromium 모바일 에뮬레이션과 구분한다.
- UTF-8·개행·후행 공백·문서 링크·PNG·실제 공개 키 값 미포함·`.env.local` Git 제외·`git diff --check` 검사. 최종 기록은 12절.

## 9. Evaluation 결과

- **EVAL-310**: 같은 진단의 구간 초 값과 지도 좌표 사용, 선택 시 새 요청 없음, 재진단 동시 갱신·선택 초기화 PASS.
- **EVAL-205 / INV-005**: 기존 UNKNOWN/PARTIAL/확인된 조정 필요 표시 회귀 PASS.
- **INV-001/004/009**: 미확인 구간의 0초 대체·연결선 생성 없음. 이후 확인된 구간의 이동시간은 예상 도착시각을 새로 만들지 않고 독립된 값으로 표시한다.
- **INV-002/003/006/007/008**: Rule/지역/저장/정책/체류시간 계산 변경 없음.
- 최종 PC·모바일 실제 API 캡처를 직접 확인했다. 시간 패널은 지도 경계와 떨어져 있으며 이름·번호·조작부와 겹치지 않는다. 중복 제목 툴팁을 제거한 최종 화면을 보관했다.

## 10. Codex B Review

- 출처: 2026-10-28 개발자가 전달한 TASK-015 요구사항·코드·테스트·캡처의 Read-Only 독립 리뷰 결과. 리뷰어는 파일을 수정하지 않았다.
- **최종 Review Result: APPROVE**. 검토 범위에서 필수 수정 사항 없음. TASK-014 리뷰를 재사용한 것이 아니라 TASK-015의 실제 리뷰 결과다.
- 번호·키보드 선택의 동일 도착 구간 대응, 같은 진단의 서버 초 값 표시, 추가 진단/길찾기 호출·시간 재계산 없음, 미확인 구간 유지와 이후 확인된 구간의 독립 표시를 확인했다.
- 재진단 선택 초기화·지도 재시도 선택 유지, 메시지 발신자/구간 ID 검증, 장소명 이스케이프를 확인했다.
- 리뷰어가 타입 검사·ESLint·순수 함수 테스트 2건을 직접 실행해 통과했다. 생성된 지도 스크립트의 선택·강조·터치/드래그 구분도 SDK 대역으로 확인했다. PC·모바일 캡처에서 시간 패널과 장소명 분리를 확인했다.
- 전체 브라우저·실제 SDK/API 테스트는 재실행하지 않았다. 8절의 Codex A 실제 API/전체 검증 기록과 리뷰어의 직접 실행 범위를 구분한다.
- 이번 APPROVE는 TASK-015 독립 리뷰 결과이며 개발자 최종 확인·Commit/Merge 승인으로 확대 해석하지 않는다.

## 11. Review 이후 수정사항

- 필수 수정 사항이 없어 코드·테스트 변경 없음. 6절의 보완은 구현 중 Codex A 자체 검증 결과다.
- 실제 APPROVE 수신 후 본 Evidence의 상태·리뷰·완료 조건만 갱신했다. 문서 전용 변경이므로 Unit/Integration/Architecture/코드 Static Analysis/Evaluation 재실행은 N/A이며 8·9절의 기존 결과를 유지한다.
- 갱신 문서의 UTF-8·개행·후행 공백·상대 링크·13개 절과 `git diff --check`를 자체 확인했다.
- 개발자 최종 확인·커밋 승인 수신 후 완료 상태를 갱신했다. 커밋 전 타입 검사·ESLint를 다시 실행해 PASS했고, TASK-015 대상 15개 파일(텍스트 11개·PNG 4개)의 형식·상대 링크 35개·실제 지도 키 값 미포함·공개 키 설정 Git 제외를 확인했다. 실행 코드 변경은 없으며 브라우저·실제 SDK/API 재실행은 N/A로 기존 기록을 유지한다.

## 12. 최종 검증 결과

- [x] 요구사항 구현·자체 검증
- [x] Unit Test
- [x] Integration Test — 전체 86 passed / 6 skipped, 마지막 관련 검증 16 passed
- [x] Architecture Test — 서버 check UP-TO-DATE 성공, 서버 변경 없음
- [x] Static Analysis — typecheck/lint/build·문서 검사
- [x] Evaluation — 9절의 명시한 범위
- [x] Invariant Check — Codex A 자체 대조
- [x] Codex B Review — TASK-015 실제 APPROVE 수신, 10절
- [x] Developer Final Check — 개발자 TASK-015 최종 확인·커밋 승인 수신

최종 문서 검사 PASS: 선행 TASK-014를 포함한 현재 변경 텍스트 15개·PNG 8개·상대 링크 35개, TASK-014/015 각각 13개 절을 확인했다. UTF-8·마지막 개행·후행 공백·PNG header·실제 공개 지도 키 미포함·`git diff --check`와 `.env.local` Git 제외를 확인했다. 테스트 5174/18080 종료·기존 5173 유지도 확인했다.

최종 실제 API 캡처 4개. 공개 관광지와 H2 테스트 계정만 표시한다.

- [PC 선택한 구간 이동시간](assets/TASK-015/desktop-diagnosis-live-leg.png)
- [모바일 선택한 구간 이동시간](assets/TASK-015/mobile-diagnosis-live-leg.png)
- [PC 결과 전체](assets/TASK-015/desktop-diagnosis-live-partial.png)
- [모바일 결과 전체](assets/TASK-015/mobile-diagnosis-live-partial.png)

## 13. Commit

- Commit Hash: 본 문서를 포함하는 TASK-015 구현 커밋. `git log -1 --format=%h -- docs/V2/docs/evidence/TASK-015.md`로 확인한다.
- Commit Message: `feat: 지도에서 선택한 구간의 이동시간 표시 (TASK-015)`
- 작업 위치: `C:\BusanFit` / `v2`. 선행 TASK-014는 `a3b8646`에 커밋되어 있다. TASK-015 추가 변경과 관련 문서·캡처만 이번 커밋에 포함한다. 브랜치/작업 폴더 전환·병합·푸시 없음.
- TASK-015 독립 리뷰 APPROVE·개발자 최종 확인·명시적 Commit 승인을 수신했다. 병합·푸시는 수행하지 않는다.
