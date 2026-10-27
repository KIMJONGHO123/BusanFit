# TASK-014 Evidence

상태: **완료 — Codex B 독립 리뷰 APPROVE 및 개발자 최종 확인 완료, TASK-014 Commit 승인 수신**.
작업일: 2026-10-28. 개발자가 실제 독립 리뷰 결과를 전달했고 TASK-014 최종 확인·커밋을 승인했다. TASK-015 추가 변경·Merge·Push 승인은 포함하지 않는다.


## 1. Task ID

`TASK-014`

## 2. Goal

진단 결과의 회색 SVG 경로 미리보기를 실제 TMAP 지도로 교체한다. 같은 진단의 경로·출발지·방문 순서·장소명과 지도 이동·확대/축소·전체 경로 보기를 제공한다.

## 3. 관련 요구사항

- 개발자는 Refero 참고 화면과 달리 실제 지도 배경이 없는 구현을 지적했고, 실제 지도 연결을 먼저 진행하도록 승인했다.
- 지도는 서버의 `schedule.segments` 좌표만 사용하며 별도 길찾기·시간 계산을 실행하지 않는다.
- 확인 불가 구간을 연결하거나 검색 좌표로 대신하지 않는다. 재진단하면 지도도 함께 교체한다.
- 기존 POSSIBLE/PARTIAL, UNKNOWN, 확인된 조정 필요와 입력·활동시간 계약을 유지한다.
- 지도 로딩 실패는 진단 결과를 유지한 별도 안내와 지도 재시도로 처리한다.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md), 특히 7절 구현 전 검증과 9절 독립 리뷰·완료 절차.
- [Architecture](../01-architecture.md), [Rules](../02-diagnosis-rules.md), [Invariants](../03-invariants.md).
- [공통 계약](../09-diagnosis-contract.md) 5절: 결과와 지도의 동일 진단 스냅샷.
- [Evaluation](../06-evaluation-set.md): EVAL-310, EVAL-205 및 미확인 처리.
- [TASK-011](TASK-011.md), [TASK-012](TASK-012.md): 기존 API·웹 구현과 실제 지도 미구현 범위.
- [PamPam 경로 화면](https://refero.design/pages/ec262ecb-b082-47cc-bc6b-6e1670057e71): 상세 메타데이터와 원본 이미지를 재확인했다.
- Refero shadcn UI style `c14c0a94-1037-449e-bf5b-4cb972656ac7`: 기존 중립색·타이포·표면 역할을 재확인했다.
- [TMAP 공식 가이드](https://tmapapi.tmapmobility.com/main.html): Map, Marker, Polyline, fitBounds, resize, getZoom/setZoom. 공식 제공 JS V2 코드의 부트스트랩·크기 인자·HTTPS 옵션도 확인했다.

## 5. 변경 파일

- `apps/web/src/features/diagnosis/DiagnosisPage.tsx`: SVG 제거, 동일 진단의 RouteMap 연결.
- `apps/web/src/features/diagnosis/RouteMap.tsx`: 지도 프레임·로딩/설정 누락/실패 안내·재시도·메시지 확인.
- `apps/web/src/features/diagnosis/route-map.ts`: 확인된 구간·마커 변환, 안전한 직렬화, TMAP 문서·지도 조작.
- `apps/web/src/index.css`: 지도 영역 크기, 로딩/오류 상태, 모바일 대응.
- `apps/web/.env.example`, `apps/web/README.md`: 공개 지도 키 설정, 지원 범위와 검증 방법.
- `apps/web/playwright.config.ts`: 새로 실행하는 기본 테스트용 Vite의 합성 공개 키. 명시적 live 실행은 실제 로컬 설정을 사용한다.
- `apps/web/tests/diagnosis-helpers.ts`, `map-fixtures.ts`: 기존 진단 UI 준비 코드 추출, 테스트 전용 SDK 대역.
- `apps/web/tests/diagnosis.spec.ts`, `diagnosis-live.spec.ts`, `route-map.spec.ts`: 회귀·실제 지도/진단 검증.
- 본 Evidence와 `assets/TASK-014/` 캡처 4개.
- 로컬 비공개 `.env.local`에 기존 모바일의 공개 지도용 키를 설정했다. Git 제외를 확인했으며 실제 값은 변경 파일·Evidence에 기록하지 않는다.

## 6. Codex A 주요 판단

### 구현 방식 / 변경 전 검증

- 실제 경로를 제공하는 기존 서버·Domain·Port·Adapter·Rule은 변경하지 않는다. 지도 SDK는 웹 표시 계층에서만 사용한다.
- 모바일에 이미 있는 TMAP 지도 SDK 구성과 공개용 지도 키를 재사용한다. 서버 경로 키·TourAPI 키를 브라우저로 옮기지 않는다. 추가 패키지·지도 공급자는 도입하지 않았다.
- SDK의 `document.write` 부트스트랩을 parser-blocking으로 실행할 별도 iframe 문서를 사용한다. iframe에는 확인된 경로·표시할 장소명만 전달하며 계정·토큰·전체 진단을 전달하지 않는다.
- iframe은 `allow-scripts allow-same-origin`으로 실행하는 같은 출처 문서다. 외부 SDK의 보안 격리 경계로 간주하지 않는다. 상태 메시지는 현재 iframe의 Window·허용 출처·채널을 확인하고, 교체된 프레임 메시지를 사용하지 않는다.
- 서버에서 확인된 구간 시작·끝 좌표로 마커를 만들고 검색 Snapshot에서는 이름만 가져온다. 미확인 중간 구간을 제외하고 뒤의 확인된 구간은 별도 선으로 표시한다. 전부 미확인이면 SDK를 로드하지 않는다.
- 경로 SDK·지도 타일 요청과 서버 길찾기를 구분한다. 지도 표시·재시도에서 진단이나 길찾기를 다시 요청하지 않는다.
- 장소명을 script 문맥에 안전하게 직렬화하고 HTML 마커·제목에 이스케이프한다. 지도 그림은 접근성 트리에서 제외하고 기존 일정표의 장소·시간 설명과 지도 조작 버튼을 제공한다.
- 초기 지도는 화면에 보이는 타일의 실제 로드를 확인한 뒤 표시한다. SDK/타일 오류·20초 초기화 제한 및 부모의 25초 제한, 지도만 재시도하는 동작을 둔다.

### 디자인 기준과 결정 기록

Refero 디자인 스킬을 적용했다. 사용자가 승인한 실제 지도 요구와 기존 BusanFit 화면을 직접 구현 대상으로 고정했다. 이미지 생성·새 시각 방향 탐색은 필요하지 않았다.

| 결정 | 근거 | 적용 범위 |
|---|---|---|
| 실제 지리 배경에 경로와 방문 번호를 겹침 | PamPam 원본 지도, 개발자 요구 | SDK 타일·동일 진단의 구간별 경로 |
| 기존 흰 패널·검정 번호·12px 모서리 유지 | 기존 BusanFit UI와 shadcn style | 기존 결과 레이아웃 유지, 지도 영역만 교체 |
| 파란 경로 선과 흰 장소명 레이블 | PamPam의 경로/지도 대비 | 파랑은 지도 경로에만 사용 |
| 전체 경로·확대/축소, 모바일 44px 이상 조작 | PamPam 지도 패턴, Refero 폼/터치 craft | 드래그 지도와 키보드로 누를 수 있는 조작 버튼 |
| 판정과 검증 상태는 기존 상단 유지 | INV-005 | 지도 오류를 일정 판정으로 바꾸지 않음 |

### 구현 중 발견한 문제와 보완

- SDK resize는 숫자 픽셀 인자가 필요했다. 실제 화면 검사에서 경로가 밀리는 문제를 확인해 숫자 크기와 ResizeObserver를 사용하도록 수정했다.
- 빠른 확대 직후 fitBounds를 실행하면 SDK 애니메이션과 충돌했다. zoom_changed 이후 전체 경로/크기 변경을 처리하도록 보완했다.
- SDK의 기본 HTML label 폭 계산으로 장소명이 화면 밖으로 나갔다. 고정 크기 iconHTML 마커로 교체하고 상단 버튼과 겹치지 않도록 fitBounds 여백을 조정했다.
- 초기 SDK 생성·일부 타일 로드만으로 캡처하면 회색 배경이 남았다. 실제 보이는 타일 로드를 기다리는 초기 표시와 live 캡처 검증을 추가했다.
- 개발 중 실패한 검증은 원인을 수정한 뒤 아래 최종 전체 검증으로 재확인했다. 실패한 중간 캡처는 최종 Evidence에 포함하지 않는다.

### 핵심 불변조건

- INV-001/004/009: 미확인 경로는 0초·직선·검색 좌표로 대체하지 않는다. 시간 계산·UNDETERMINED는 서버 결과 그대로다.
- INV-002/003/007/008: Rule 중요도·지역 선택·정책·최종 체류시간 계산을 변경하지 않는다.
- INV-005: 판정·검증 상태·근거 표시를 유지하며 지도 장애는 별도로 알린다.
- INV-006: 외부 원본 저장·운영 로그·DB 변경 없음. 마커에 필요한 최소 경로만 브라우저 지도에 전달한다.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 추가 정책 결정 요청 없음. 실제 지도 교체와 기존 TMAP 지도 구성 재사용은 승인된 작업 범위로 판단했다. Rule 의미·서버 계약·저장 정책을 변경하지 않는다.

### 개발자 결정

- “ㅇㅋ 그렇게 진행해”로 실제 지도 연결·출발지/방문 순서/장소명·확대/축소·전체 경로 보기 구현을 승인했다.
- 최초 지시는 구현 승인으로 기록했으며, 당시 독립 리뷰·최종 확인·Commit/Merge 승인은 포함하지 않았다.
- 이후 실제 독립 리뷰 APPROVE를 전달받았고, 2026-10-28 개발자가 TASK-014 Evidence를 확인한 뒤 커밋을 명시적으로 승인했다. 이번 승인은 TASK-014 변경에 한정하며 TASK-015·병합·푸시를 포함하지 않는다.

## 8. 자동 검증 결과

### Unit Test

- `route-map.spec.ts`의 순수 검증 2종 × PC/모바일 프로젝트: 동일 좌표 보존, 미확인 중간 구간 격리와 마커 순서, 전부 미확인, script 경계 직렬화 검증 PASS.
- 새 지도 테스트의 fixture·SDK 대역은 테스트 파일에만 있으며 제품 코드에 합성 지도/경로 대체가 없다.

### Integration Test

- 최종 웹 전체: **88건 중 82 passed / 6 skipped, 실패 0, 40.6초**.
- 명령: H2 테스트 서버와 별도 5174 Vite에서 `BUSANFIT_LIVE_WEB_DIAGNOSIS=1`, `BUSANFIT_LIVE_MAP=1`, `BUSANFIT_API_TARGET=http://127.0.0.1:18080`, `BUSANFIT_WEB_BASE_URL=http://127.0.0.1:5174`, `BUSANFIT_WEB_PORT=5174`를 설정한 뒤 `npm test -- --workers=2`.
- 실제 진단 2건: PC·모바일의 실제 TourAPI 검색/상세 → 로그인/가입 → TMAP 경로 → 실제 SDK/타일 → 100분 체류 진단 → 600분으로 수정·재진단. 같은 감천문화마을 ID·POSSIBLE 또는 CAUTION과 PARTIAL·재진단 ADJUSTMENT_REQUIRED와 PARTIAL을 확인했다. 외부 응답 대역 없음.
- 실제 지도 2건: 진단·인증은 명시적 합성 응답, 지도 SDK/타일만 실제다. 확대 직후 전체 경로 복귀, 장소명 표시·버튼 겹침 없음·화면 내 배치·보이는 타일 로드·가로 넘침 없음을 확인했다. 실제 경로 API 검증과 구분한다.
- 기본 회귀: SDK 오류 후 지도만 재시도·진단 요청 1회 유지, 정확한 서버 경로 좌표 전달, 재진단 좌표 교체, UNKNOWN·PARTIAL·CRITICAL 표시 및 기존 검색·시간/활동 입력을 확인했다.
- skipped 6건은 별도 `BUSANFIT_LIVE_TOURAPI` 검색 전용 시나리오 미활성화다. 실제 진단 테스트의 TourAPI 검색 검증과 구분한다.
- 실제 계정 생성은 기존 검증용 H2 `diagnosis_web`만 사용했다. 개발 MySQL·기존 8080 서버는 변경하지 않았다. 테스트 18080 서버와 Playwright가 실행한 5174 Vite는 종료했다.

### Architecture Test

- 서버 `.\gradlew.bat check` 성공. **모든 태스크 UP-TO-DATE**로 새 실행은 아니다. 기존 보고서의 Architecture 2건 PASS를 확인했다.
- 서버/Domain/의존성 변경은 없으며 새 서버 Architecture 검증 추가는 N/A. SDK는 웹에만 존재한다.

### Static Analysis

- 최종 코드의 `npm run typecheck`, `npm run lint`, `npm run build` PASS.
- 기존 자동 axe WCAG 2A/AA·2.1AA 진단·로그인 검사 PASS. 브라우저 에뮬레이션이며 실제 iOS Safari·수동 스크린리더 검증은 아니다.
- 변경 파일 UTF-8·개행·후행 공백·문서 링크·`git diff --check`, 공개 지도 키 실제 값 미포함·`.env.local` Git 제외 자체 확인. 최종 문서 검사 결과는 12절 참조.

## 9. Evaluation 결과

- **EVAL-310**: 동일 서버 경로 좌표를 지도 SDK에 전달하는 대역 검증, 재진단 경로 교체 검증, 실제 V2 진단과 지도 표시 흐름 PASS. 별도 길찾기 호출 없이 경로 표시·시간 계산 스냅샷을 공유한다.
- **EVAL-205 / Verification Visibility**: 기존 결과·인증·UNKNOWN·PARTIAL·확인된 조정 필요 표시 회귀 PASS.
- UNKNOWN 구간은 연결하지 않으며 전부 미확인일 때 지도를 만들지 않는 경계 PASS. 부산/타 지역 Rule 변경은 N/A.
- Refero 원본과 실제 PC·모바일 지도/전체 결과 캡처를 직접 비교했다. 실제 지리 배경, 번호·장소명·경로, 조작부, 기존 판정 계층을 확인했다. PamPam 사진 마커·협업·경로 재배치 기능은 이번 요구 범위가 아니다.

## 10. Codex B Review

- 출처: 2026-10-28 개발자가 전달한 TASK-014 코드·테스트·문서·지도 캡처의 Read-Only 독립 리뷰 결과. 리뷰어는 파일을 수정하지 않았다.
- **최종 Review Result: APPROVE**. 필수 수정 사항 없음.
- 동일 진단의 서버 좌표만 사용하고 별도 길찾기를 호출하지 않음, 미확인 구간 연결·검색 좌표 대체 없음, 재진단 지도 교체, 지도 실패·재시도와 진단 결과 분리를 확인했다.
- 장소명 직렬화·HTML 이스케이프와 공개 지도 키의 Git 제외를 확인했다.
- 리뷰어가 타입 검사·ESLint·순수 함수 테스트 2건·문서 검사를 직접 실행해 통과했다. 전체 브라우저·실제 SDK 테스트는 재실행하지 않고 기존 테스트 기록과 캡처로 검토했다.
- 8·9절의 Codex A 전체 검증 기록과 리뷰어의 직접 재검증 범위를 구분한다. 이번 APPROVE는 개발자 최종 확인·Commit/Merge 승인으로 확대 해석하지 않는다.

## 11. Review 이후 수정사항

- 필수 수정 사항이 없어 코드·테스트 변경 없음. 6절의 수정은 구현 중 자체 검증에 따른 수정이다.
- 실제 APPROVE 수신 후 본 Evidence의 리뷰·상태·완료 조건만 갱신했다. 문서 전용 변경이므로 Unit/Integration/Architecture/코드 Static Analysis/Evaluation 재실행은 N/A이며 8·9절의 기존 결과를 유지한다.
- 갱신 문서의 UTF-8·개행·후행 공백·상대 링크·13개 절과 `git diff --check`를 자체 확인했다.
- 개발자 최종 확인·커밋 승인 수신 후 완료 상태를 갱신했다. TASK-015 직전 보존본을 사용해 TASK-014만 스테이징하고 후속 변경은 작업 트리에 유지한다. 커밋 대상의 문서·정적 검사와 범위 검증을 별도로 수행한다. 기존 브라우저·실제 SDK 검증 결과는 8절과 구분한다.
- 커밋 대상 자체 검사 PASS: 17개 파일(텍스트 13개·PNG 4개), 커밋 트리 내부 상대 링크 22개, staged 소스 기준 TypeScript 진단 0·ESLint 9개 파일 오류/경고 0. 두 파일의 마지막 중복 빈 줄만 정리했다. 승인된 TASK-014 보존본과 해당 소스의 일치를 확인했고, TASK-015 구간 선택·이동시간 UI는 제외했다. 실행 코드의 새 기능 변경은 없으므로 브라우저·실제 API 재실행은 N/A이며 기존 검증 기록을 유지한다.

## 12. 최종 검증 결과

- [x] 요구사항 구현·자체 검증
- [x] Unit Test
- [x] Integration Test — 웹 전체 82 passed / 6 skipped, 실제 진단/지도 포함
- [x] Architecture Test — 서버 check UP-TO-DATE 성공, 기존 보고서 확인, 신규 서버 변경 없음
- [x] Static Analysis — typecheck/lint/build 및 변경 문서 검사
- [x] Evaluation — 9절의 명시한 실행 범위
- [x] Invariant Check — Codex A 자체 대조
- [x] Codex B Review — 실제 APPROVE 수신, 10절
- [x] Developer Final Check — 개발자 TASK-014 확인·커밋 승인 수신

최종 문서 검사: 변경 텍스트 13개·PNG 4개·상대 링크 22개·Evidence 13개 절의 형식 검사 PASS. UTF-8·마지막 개행·후행 공백·PNG header·실제 공개 지도 키 미포함·`git diff --check`와 `.env.local` Git 제외를 확인했다. 기존 5173 Vite는 실행 상태로 유지하고 5174/18080 검증 서버의 종료를 확인했다.

실제 API 캡처 4개. 계정은 검증용 H2 테스트 계정이며 공개 관광지·경로만 표시한다.

- [PC 실제 지도](assets/TASK-014/desktop-diagnosis-live-map.png)
- [모바일 실제 지도](assets/TASK-014/mobile-diagnosis-live-map.png)
- [PC 실제 결과 전체](assets/TASK-014/desktop-diagnosis-live-partial.png)
- [모바일 실제 결과 전체](assets/TASK-014/mobile-diagnosis-live-partial.png)

## 13. Commit

- Commit Hash: 본 문서를 포함하는 TASK-014 구현 커밋. `git log -1 --format=%h -- docs/V2/docs/evidence/TASK-014.md`로 확인한다.
- Commit Message: `feat: 진단 결과에 실제 TMAP 지도 연결 (TASK-014)`
- 현재 위치: `C:\BusanFit` / `v2`. 기존 브랜치·작업 폴더 유지. 병합·푸시 없음.
- 독립 리뷰 APPROVE·개발자 최종 확인·TASK-014 Commit 승인을 수신했다. 승인된 TASK-014 당시 변경만 커밋하고 TASK-015 추가 변경은 작업 트리에 보존한다. 병합·푸시는 수행하지 않는다.
