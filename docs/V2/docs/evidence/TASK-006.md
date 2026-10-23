# TASK-006 Evidence

상태: **Codex B 재검토 APPROVE 및 개발자 최종 확인 완료 — Commit 승인됨**.
작업일: 2026-10-23. 첫 번째 화면만 구현했으며 V2 전체 기능 완료가 아니다.

## 1. Task ID

`TASK-006`

## 2. Goal

선택된 Refero 방향 B를 중심으로 React 웹의 관광지 검색·선택 화면을 구현한다. 사용자 확인 전 다른 화면을 구현하지 않는다.

## 3. 관련 요구사항

- Figma 생략, B 기본 방향과 기능별 A/C 보조 레퍼런스 활용 승인.
- 검색, 실제 반환 정보의 상세 확인, 선택/해제, 중복 방지, PC/모바일 지원.
- 실제 없는 데이터·진단·저장을 완성된 기능으로 표현하지 않는다.
- 기존 모바일·서버·사용자 수정 파일 보존. Commit/Merge 미수행.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md)
- [Architecture](../01-architecture.md), [Rules](../02-diagnosis-rules.md), [Invariants](../03-invariants.md)
- [Workflow](../05-development-workflow.md), [Evaluation](../06-evaluation-set.md), [공통 계약](../09-diagnosis-contract.md)
- [웹 환경 구축](TASK-005.md)

### 승인된 디자인 기준과 구현 결정

전체 기준은 B의 시간 중심 작업 화면이다. A의 지도 패턴과 C의 카드 패턴은 기능별 보조로 사용할 수 있다는 대화상 선택을 유지한다. 이번에는 검색 화면만 만든다.

| 결정 | 근거 | 적용 / 원본과 차이 |
|---|---|---|
| 중립색·타이포 계층 | Refero Cal.com style `23fd2b9b-b9ea-45e3-8370-7451ea05cee6` 상세 조회 | #F4F4F4 바탕, 흰 표면, #101010 주요 버튼, 12px 카드. 원본 영문 전용 폰트 대신 한글 시스템 산세리프 |
| 장소 이름·주소·사진의 행 목록 | [Tripadvisor 검색](https://refero.design/pages/b6bc3895-f6bc-4c57-9b45-44978bef1c6e), 실제 이미지 재확인 | 원본 검색 오버레이를 지속적인 검색 작업 영역으로 변경. 목록에서 직접 추가 가능 |
| 순서가 있는 선택 장소 패널 | B의 세로 일정 구조 및 [Tripadvisor 일정](https://refero.design/pages/e85a0a39-08cc-461c-9b10-9ff0ee408e30) | 일정표 구현 대신 선택 순서를 표시하는 목록. 시간·동선 계산 없음 |
| 검색→상세→선택 피드백 | 기존 조사 [PamPam flow 4744](https://refero.design/flows/4744) | 선택한 장소 수, 선택됨 버튼, 상세에서 선택 상태 공유. 지도는 이번 화면에 구현하지 않음 |
| 1200px 내용 폭, 24px 패널 여백, pill 버튼 | Cal.com 상세 스타일 및 사용자 반응형 요구 | 760px 이하 1열 + 선택 목록 바로가기, 960px 이하 패널 폭 조정 |
| 정보 없음과 실패 구분 | 공통 계약, INV-001/004 | 운영시간 확인 불가, 권장시간 근거 없음. 오류를 빈 결과로 대체하지 않음 |

보존할 특징: 밝은 중립색 작업 공간, 검정 주요 행동, 정렬된 행 목록, 절제된 그림자, 작은 장소 사진. 큰 홍보 이미지·다색 대시보드·무근거 안전 배지 도입 안 함. 사진은 API URL만 사용하고 없거나 로딩 실패하면 동일 크기의 ‘사진 없음’ 영역으로 유지한다. 생성 이미지/외부 홍보 사진 없음.

후속 화면의 구성 기준만 정리: 일정 편집은 세로 시간표, 결과는 판정/검증 상태와 대상별 원인·수정 안내, 지도는 A의 경유지 패널, 홈은 새 일정 진입·기존 일정 목록. 후속 화면 코드는 없음.

## 5. 변경 파일

- `apps/web/src/App.tsx`, `src/index.css`: 진입 화면과 반응형 디자인.
- `apps/web/src/components/Icon.tsx`: 공통 아이콘.
- `apps/web/src/features/places/places.ts`: 검색 응답 정규화·검증, 검색 호출, 중복 선택 방지.
- `apps/web/src/features/places/PlaceSearchPage.tsx`, `PlaceImage.tsx`: 검색/선택/상세, 사진 실패 처리.
- `apps/web/vite.config.ts`: 로컬 API 개발 프록시.
- `apps/web/package.json`, `package-lock.json`, `playwright.config.ts`, `tests/places.spec.ts`, `.gitignore`: 테스트·접근성 검사와 산출물 제외.
- `apps/web/README.md`: 실행·연결·미구현 범위·검증 안내.
- 이 Evidence 및 `assets/TASK-006/` 브라우저 캡처.

## 6. Codex A 주요 판단

### 구현 방식

- 재사용할 기존 웹 공통 컴포넌트 없음. React state와 fetch를 사용하고 불필요한 라우터·전역 상태 라이브러리는 도입하지 않음.
- 부산 관광지만 반환하는 기존 API 범위를 그대로 표시. 외부 API 비밀키를 웹에 넣지 않음.
- 응답 ID·이름·좌표 유효성 검증. HTTP/네트워크/JSON 구조 오류·15초 타임아웃과 빈 결과 구분. 이전 요청 취소와 최신 요청 식별로 응답 역전 방지.
- 선택 ID 유지, 중복 추가 방지, 다른 검색·페이지 전환 중 선택 유지. 영구 저장은 미구현이며 새로고침 시 초기화 사실 표시.
- 서버의 estimatedStayMinutes는 일괄 90분으로 장소별 근거가 없어 노출하지 않음. 별도 운영시간/상세 설명 endpoint 없음. 없는 정보를 추정 생성하지 않음.
- 상세 native dialog, 명시적 label, live region, 키보드 포커스 이동·복원, Escape 닫기, 최소 44px 행동 영역. 사진 없는 경우 대체 영역.
- 초기 화면은 검색 전 안내. 키워드 예시는 검색 실행 버튼일 뿐 mock 검색 결과가 아님.

### 기존 구조와의 관계 / 구현 전 검증

- Domain·Rule·Registry·지역 정책·서버를 수정하지 않음. UI에서 POSSIBLE/SAFE 등 판정 생성 없음. Rule 충돌, Scope 확대, UNKNOWN 안전 간주 없음.
- 기존 검색 ID와 V2 진단 ID의 연결은 서버의 후속 과제. 검색 UI 성공이 진단 연동 성공을 뜻하지 않음.
- 작업 전 이미 수정된 모바일 condition/diagnose/store 및 architecture 문서는 보존.

### 구현 중 발견한 문제

- 여러 테스트 라이브러리 일괄 npm 설치에서 기존 환경의 `edgesOut` 오류 재발. 해당 조합 미도입. Playwright와 axe만 정상 설치하여 단위·브라우저 통합 검사 수행.
- 초기 자동 접근성 검사에서 단계 표시의 문자 대비 부족 발견. 회색을 조정한 후 재검증.
- 데스크톱 역방향 Tab 이동에서 브라우저 UI로 포커스가 나가는 사례를 확인하고 상세 대화상자 내부 순환 처리 추가.
- 로컬 8080 서버 및 3306 DB 리스너 없음. 실제 Chrome에서도 검색 연결 실패 안내 확인. 서버/DB 설정을 변경하거나 임의 테스트 서버를 제품 서버처럼 실행하지 않음.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 새 도메인 정책 결정 없음. 기존 API의 부산 한정, 상세 정보 부족, 일괄 체류시간 및 실제 서버 미실행을 구현 전/진행 중 보고.

### 개발자 결정

- 사용자 요청으로 Refero B 중심 직접 구현, 첫 화면만 구현·검증하도록 승인됨.
- 이후 화면·최종 디자인·Commit/Merge 승인은 아직 없음.

## 8. 자동 검증 결과

아래 18개 통과는 2026-10-23 최초 구현 검증 기록이다. 2026-10-24 리뷰 반영 후 결과는 11절에 기록한다.

### Unit Test

- 결과: PASS. 아래 순수 함수 테스트를 포함한 최종 전체 실행 18/18 통과.
- `npm test`: 응답 배열/필수 ID/좌표 검증, 위험한 사진 URL 차단, 중복 선택 방지, 검색 ID 및 순서 유지, 근거 없는 체류시간 제외.
- 브라우저 테스트와 동일 Playwright runner에서 순수 함수 테스트 실행.

### Integration Test

- 결과: fixture 기반 브라우저 통합 PASS. 최종 `npm test` 18 passed (6.9s).
- `npm test`: Chrome desktop 1440×1000 및 mobile 390×664 에뮬레이션 기준. 각 9개, 총 18개 검증.
- 검색→상세→선택/해제, 검색 간 선택 유지, 페이지 이동, 실패/빈 결과/잘못된 응답/재시도, 늦은 이전 응답, 타임아웃, 이미지 실패, 긴 이름 320px, 모달 키보드 포커스 및 axe 검사.
- 성공 데이터는 테스트 전용 합성 API 응답. 앱에서 테스트 데이터 import/fallback 없음.
- 실제 Spring Boot→TourAPI 성공 통합 검증은 미수행(로컬 서버·DB 미실행). 자동 테스트 통과와 구분.
- iOS Safari/실물 모바일 기기 검증 미수행. Chromium 에뮬레이션임.

### Architecture Test

- 서버 Architecture Test N/A: Java/도메인 의존성 변경 없음.
- 소스 검토: 웹은 자체 서버 `/api/places/search`만 조회, 외부 SDK·도메인 판단·원본 응답 저장 없음.

### Static Analysis

- 결과: 타입 검사·린트·프로덕션 빌드·diff 공백 검사 모두 PASS.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `git diff --check -- apps/web docs/V2/docs/evidence/TASK-006.md`.
- npm 설치 감사 취약점 0건.

### 시각 검증

- 실제 Chrome 렌더링 캡처에서 PC 2열, 모바일 1열/하단 바로가기, 상세 대화상자 확인.
- 320px 긴 이름에도 가로 넘침 없음. 초기/상세 axe WCAG 2A/2AA/2.1AA 위반 0건(자동 검사 범위, 접근성 전체 인증 아님).
- 원본과 차이: 별도 선택 패널, 한글 시스템 폰트, 미확인 정보 안내, 단계 표시, 지도 제외.
- [PC 초기](assets/TASK-006/desktop-initial.png), [모바일 초기](assets/TASK-006/mobile-initial.png).
- [PC 선택 결과 — 합성 테스트 데이터](assets/TASK-006/desktop-results-fixture.png), [모바일 선택 결과 — 합성 테스트 데이터](assets/TASK-006/mobile-results-fixture.png), [모바일 상세 — 합성 테스트 데이터](assets/TASK-006/mobile-detail-fixture.png).

## 9. Evaluation 결과

- 기존 진단 Evaluation EVAL-001~314 실행 N/A: 진단 엔진·계약 출력 구현/변경 없음. 검색 UI 테스트를 EVAL-304 진단 통합 성공으로 기록하지 않음.
- UI 범위 검증: 빈 결과와 실패 분리, mock 자동 대체 없음, 근거 없는 운영시간/권장시간 표시 없음, 검색 ID 유지, 중복 선택 방지.

## 10. Codex B Review

- 출처: 2026-10-24 개발자가 전달한 별도 Codex B Read-Only 리뷰 결과.
- **Review Result: CHANGES_REQUIRED**. P2 필수 수정 1건: 결과 개수로 마지막 페이지를 판단하면 서버 필터링·웹 중복 제거 이후의 관광지가 누락될 수 있음.
- 요구 수정: 원본 페이지 메타데이터 제공 또는 현재 배열 계약에서 다음 페이지 탐색 허용. 항목 제외 후 후속 페이지 접근 회귀 테스트 추가.
- 그 외 도메인 책임 분리, 근거 부족 표시, 일괄 90분 미노출, 실패/빈 결과 분리, mock 자동 대체 없음, ID 유지/중복 방지/요청 역전 방지, 미구현 범위 명시를 확인함.
- 서버 Architecture Test 및 진단 Evaluation N/A 사유는 타당하다고 검토함.
- Codex B 직접 실행: 타입 검사, ESLint, diff 공백 검사 통과. 브라우저 테스트·빌드는 산출물 쓰기 때문에 미실행, 기존 18개 기록과 테스트 코드만 검토.
- 실제 서버 성공 연동 미검증.

### 수정 후 독립 재검토

- 출처: 2026-10-24 개발자가 전달한 별도 Codex B Read-Only 재검토 결과.
- **최종 Review Result: APPROVE**. 이전 P2 해결 확인, 추가 필수 수정 사항 없음.
- 결과가 19건·0건이어도 다음 이동 가능하며 빈 페이지를 마지막으로 단정하지 않음을 확인. 서버 필터링·웹 중복 제거 후 빈 2페이지를 지나 3페이지 접근, 선택 유지 및 이전 이동 회귀 테스트를 검토함.
- 서버·Domain·Rule 계약 유지, 미확인 정보 표시, 실패/빈 결과 구분, 중복 선택 방지, mock 자동 대체 금지 유지 확인.
- Codex B 직접 재실행: 타입 검사, ESLint, diff 공백 검사 PASS. 읽기 전용 환경이므로 빌드·브라우저 테스트는 재실행하지 않았으며, 24개 통과 Evidence 및 테스트 소스를 검토함.
- 실제 서버 성공 연동은 여전히 미검증. 마지막 페이지를 알 수 없어 빈 페이지 이후에도 수동 탐색 가능한 한계는 화면·문서에 명시되어 있으며 TASK-006 범위에서 승인 가능하다고 판단함.
- Codex B는 코드·Evidence를 수정하지 않음. 본 기록은 전달받은 결과를 Codex A가 반영한 것이며, 개발자 최종 확인과 Commit/Merge 승인은 별도 대기.

## 11. Review 이후 수정사항

- Codex A가 실제 `TourApiClient.addPlaceIfValid`의 항목 제외와 웹 `parsePlaces`의 중복 제거를 재확인해 지적을 유효한 결함으로 판단함.
- 서버/도메인/검색 응답 계약은 변경하지 않음. 성공 응답 후 표시 개수와 무관하게 페이지 탐색 제공. 첫 페이지의 이전 버튼만 비활성화.
- 0건 응답을 마지막 페이지나 전체 검색 결과 없음으로 단정하지 않고 ‘이 페이지에 표시할 장소가 없어요’로 표현. 다음 페이지 탐색 안내 및 전체 페이지 수 미확인 안내 추가.
- 한계: 현재 배열 응답만으로 원본 마지막 페이지를 알 수 없어 빈 페이지 이후에도 수동 다음 탐색을 허용한다. 자동 연속 요청은 하지 않음. 원본 hasNext/totalCount 계약 확장은 이번 범위에서 하지 않음.
- 회귀 테스트: 서버 제외 후 19건, 서버 제외 후 0건, 웹 중복 제거 전 20건→19건의 각 첫 페이지에서 빈 2페이지를 지나 3페이지 장소 선택 가능. 이전 이동, 요청 keyword/page/size, 선택 유지, 첫 페이지 이전 비활성화 및 가로 넘침 검사 포함. PC/모바일 총 6개 추가.
- README에 배열 계약의 페이지 한계 명시. 다음 화면·서버·기존 사용자 수정 파일 변경 없음.
- 수정 후 검증: `npm run typecheck`, `npm run lint`, `npm run build` PASS. `npm test` **24 passed (8.2s)**. 서버 Architecture / 진단 Evaluation N/A 사유 및 실제 서버 성공 연동 미검증 상태 유지.

## 12. 최종 검증 결과

- [x] 첫 화면 구현 및 자체 검증
- [x] 단위·브라우저 fixture 통합·정적 분석·시각 확인
- [x] UI 범위 불변조건 확인
- 서버 Architecture / 진단 Evaluation: N/A(위 근거).
- 실제 검색 API 성공 연동: 미검증(실행 환경 미가동).
- [x] Codex B 최초 독립 리뷰 수신 — CHANGES_REQUIRED
- [x] 필수 수정 반영 및 자체 재검증
- [x] Codex B 독립 재검토 수신 — APPROVE
- [x] 사용자 화면 승인 및 Developer Final Check — 2026-10-24 개발자가 확인 완료와 커밋 진행을 명시적으로 승인함.
- 다음 화면 구현은 시작하지 않음.

## 13. Commit

- Commit Hash: 이 Evidence를 포함한 커밋은 `git log --oneline -- docs/V2/docs/evidence/TASK-006.md`로 확인.
- Commit Message: `feat: implement place search and selection UI (TASK-006)`.
- 승인 범위: 커밋까지만. Push/Merge 및 다음 화면 구현은 승인 범위에 포함되지 않음.
