# TASK-012 Evidence

상태: **완료 — Codex B 독립 재리뷰 APPROVE 및 개발자 최종 확인 완료, Commit 승인됨**.
작업일: 2026-10-26. 웹 진단 진입·인증·결과·구간 경로·재진단 연결. 선행 TASK-011의 독립 리뷰 완료를 뜻하지 않는다.

## 1. Task ID

`TASK-012`

## 2. Goal

개발자가 웹에 진단 버튼이 없음을 지적한 사용자 흐름의 공백을 해결한다. 실제 웹에서 장소·시간 입력 → 진단하기 → 필요 시 로그인/가입 → V2 서버 결과 확인 → 수정·재진단까지 사용할 수 있게 한다.

## 3. 관련 요구사항

- 기존 화면의 ‘입력 확인’만으로 실제 진단을 이용할 수 없었음. 주 동작 ‘진단하기’를 추가하고 입력 확인은 형식 검사 보조 기능으로 유지함.
- 기존 진단 API의 인증 요구를 유지하며 웹에 없는 로그인·회원가입 진입을 연결함. 비로그인으로 진단 API를 공개하지 않음.
- 최종 판정과 시간 계산은 서버 책임. 웹은 요청 변환·응답 계약 검증·표시만 수행함.
- 판정과 검증 상태, 확인 불가·미지원 이유를 함께 표시하고 계산 불가를 0으로 바꾸지 않음.
- 시간과 경로는 동일한 진단 스냅샷을 사용하며 수정·재진단 시 함께 교체함. 미확인 경로를 임의 연결하지 않음.
- 기존 검색·편집·활동·사용자 체류시간 입력과 왕복 유지 동작을 보존함.
- DB 일정 저장, 자동 재배치, 새 Rule·정책, 운영시간·날씨·지역 데이터 확대는 이번 범위에 포함하지 않음.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md)
- [Architecture](../01-architecture.md)
- [Rules](../02-diagnosis-rules.md)
- [Invariants](../03-invariants.md)
- [Evaluation](../06-evaluation-set.md)
- [공통 계약](../09-diagnosis-contract.md)
- [기존 웹 입력](TASK-007.md)
- [선행 서버 구현 TASK-011](TASK-011.md)
- 디자인 참고: [shadcn UI](https://ui.shadcn.com), [PamPam 경로 화면](https://refero.design/pages/ec262ecb-b082-47cc-bc6b-6e1670057e71), [TravelPerk 일정 화면](https://refero.design/pages/f2b28a8b-09ad-463c-9723-8eddd505b7dc).

## 5. 변경 파일

- `apps/web/src/App.tsx`: 검색·편집·결과 전환, 메모리 로그인과 요청 당시 일정/결과 스냅샷.
- `apps/web/src/features/planner/PlannerPage.tsx`: 진단하기 버튼·입력 검사·인증 진입·실제 V2 요청·로딩/실패/만료/취소 처리. 입력 확인은 보조 동작으로 유지함.
- `apps/web/src/features/planner/planner.ts`: 요청 변환 함수의 기존 ‘향후 연결’ 주석을 현 구현에 맞게 변경함. 시간 정책 변경 없음.
- `apps/web/src/features/auth/AuthDialog.tsx`: 기존 로그인/가입 API 연결, 오류·취소·포커스·비밀번호 입력 상태 처리.
- `apps/web/src/features/diagnosis/diagnosis.ts`: V2 타입·계약/상태/coverage/대상 검증, 날짜·초 단위 시간의 표시 변환.
- `apps/web/src/features/diagnosis/DiagnosisPage.tsx`: 판정·검증 상태·예상 일정·미확인 항목·근거·출처·경로 미리보기·수정/로그아웃.
- `apps/web/src/index.css`: 기존 흑백 UI를 확장한 로그인·진단·모바일 스타일.
- `apps/web/tests/diagnosis-fixtures.ts`, `diagnosis.spec.ts`, `diagnosis-live.spec.ts`: 테스트 전용 Fixture, 응답/상태/인증/재진단/접근성, 실제 브라우저 API 연결 검증.
- `apps/web/vite.config.ts`, `playwright.config.ts`: 기본 5173/8080을 유지하며 격리 검증용 웹 주소·포트·서버 proxy 환경변수 지원.
- `apps/server/src/main/java/com/busanfit/global/config/SecurityConfig.java`: Expo 외 Vite 개발 주소의 정확한 Origin 허용, 배포용 목록 설정. JWT·API 인증 요구 유지.
- `apps/server/src/test/java/com/busanfit/diagnosis/api/WebCorsApiContractTest.java`: 허용 Origin·실제 POST·임의 외부 Origin 거부 회귀 검증 5건.
- `apps/server/src/test/java/com/busanfit/diagnosis/WebDiagnosisTestServer.java`, `apps/server/build.gradle`: 실제 브라우저 검증용 18080/H2 서버 태스크. H2·테스트 JWT·5174 Origin을 고정하고 실제 API 키만 비공개 설정에서 읽음.
- `apps/web/README.md`, `apps/server/README.md`, 본 Evidence, `assets/TASK-012/` 캡처 8개.
- TASK-011의 기존 미커밋 코드·Evidence는 보존함. 그 서버 엔진 구현을 이번 변경의 신규 구현이나 독립 리뷰 완료로 기록하지 않음.
- 작업 도중 별도 세션에서 추가된 TASK-010의 후속 계획 문서 변경도 보존하며 이번 구현 범위에 포함하지 않음.

## 6. Codex A 주요 판단

### 구현 방식 / 변경 전 확인

- 기존 웹에는 ‘입력 확인’만 있었고 로그인 UI도 없었음. 기존 API와 SecurityConfig는 인증을 요구했으므로 기존 인증 흐름을 웹에 연결함.
- 기존 Rule·집계·지역 선택·불변조건 변경 없음. 웹에서 POSSIBLE/CAUTION/조정 필요를 계산하거나 서버 판정을 임의 교체하지 않음.
- 요청에는 기존 `buildDiagnosisInput`을 사용함. 서버 활동 정책과 최종 plannedStaySeconds를 보존하며 활동시간을 다시 더하지 않음.
- HTTP·응답 형식 오류를 진단 성공으로 표시하지 않음. 응답 enum, 날짜/offset·시간·대상 ID·좌표·Rule outcome·coverage 대응을 검사하고 모순된 VERIFIED·POSSIBLE 응답을 거부함. 거부 시 새 판정을 만들지 않고 요청 실패를 표시함.
- 정상·부분 확인은 같은 상단 영역에서 함께 표시함. UNDETERMINED/UNKNOWN과 ADJUSTMENT_REQUIRED/PARTIAL을 별도 표현하며 확인된 CRITICAL 조정 필요를 숨기지 않음.
- 경로 미리보기는 응답 구간 좌표만 SVG로 표시함. 배경 지도·지도 타일·다른 길찾기 서비스 없이 경로 모양을 보여준다는 한계를 화면에 명시함. 미확인 구간은 연결선을 생성하지 않음.
- 입력·로그인 토큰·결과는 App 메모리에서만 유지함. localStorage/sessionStorage·운영 로그·DB에 비밀번호/토큰/전체 일정을 추가 저장하지 않음. 사용자가 회원가입을 제출한 경우 기존 서비스의 계정 저장 동작을 사용함.
- 진행 요청의 중복 제출을 차단하고 페이지를 떠나면 AbortController로 취소함. 401은 입력을 유지한 재로그인, 나머지 오류·120초 초과는 재시도 가능한 실패 상태로 남김. 자동 재요청·임의 데이터 대체 없음.

### 디자인 참고와 결정 기록

Refero 디자인 스킬을 적용함. 기존 승인된 BusanFit 화면을 주 시각 기준으로 고정하고, Refero에서 shadcn UI style `c14c0a94-1037-449e-bf5b-4cb972656ac7`와 PamPam·TravelPerk 화면을 조회함. 새 시각 방향 탐색이나 재디자인을 진행하지 않음.

| 결정 | 근거 | 적용 범위 |
|---|---|---|
| 기존 흰 패널·회색 배경·검정 CTA·12px radius·시스템 한글 글꼴 유지 | 기존 TASK-007 화면, shadcn의 중립색/역할 구분 | 신규 진단·인증 화면만 기존 token 사용 |
| 일정 판정과 검증 상태를 같은 상단 패널에 배치 | INV-005와 공통 계약 | 일부 확인을 성공 아래 숨기지 않음 |
| 방문 순서·구간 시간·경로 모양을 나란히 배치 | PamPam의 번호/경로 정보, 기존 일정 편집 | 타일·사진·색상을 복제하지 않고 같은 서버 스냅샷 연결만 적용 |
| 일정 수정·재진단의 명시적 동작 | TravelPerk의 단일 주 동작/일정 정보 계층 | 결과에서 입력으로 돌아가 계획을 유지 |
| 로그인은 닫을 수 있는 dialog, 입력 label·자동완성·오류·포커스 복원 | 기존 장소 dialog, 스킬의 form/focus craft | 기존 인증을 이용하는 진단 진입에 한정 |

### 구현 중 발견한 문제 / 수정

- 초기 실제 브라우저 가입 POST가 403으로 거부돼 진단 요청까지 진행되지 않았음. 기존 CORS는 Expo의 localhost:8081만 허용했고 Vite proxy를 통한 브라우저 POST Origin을 허용하지 않았음.
- 기본 목록에 `http://127.0.0.1:5173`, `http://localhost:5173`을 명시적으로 추가함. `app.cors.allowed-origins`로 정확한 배포 주소를 지정할 수 있으며 인증·JWT·wildcard 금지는 유지함. 격리 서버는 CLI에서 5174만 허용함. 수정 후 실제 PC·모바일 흐름 모두 재검증함.
- 렌더링 검사에서 기존 `.planner-bottom .button`이 새 검정 버튼 배경을 흰색으로 덮어쓰는 문제와 모바일 로그아웃/시간 단위 줄바꿈을 발견해 수정하고 다시 확인함.
- 지리적 배경·확대/축소가 있는 지도, 일정 저장, 브라우저 URL 라우팅·새로고침 복원은 미구현임. 경로 미리보기·메모리 상태의 한계를 화면과 README에 유지함.

### 불변조건 자체 점검

- INV-001/004/005/009: 계산 불가의 0초 대체 없음. 미확인·미지원은 별도 목록과 coverage·출처로 노출함. 잘못된 응답을 임의 정상 판정으로 바꾸지 않음.
- INV-002: 조정 필요 결과와 검증 불가를 함께 표시하며 CRITICAL 항목을 정상 결과로 상쇄하지 않음.
- INV-003: 지역 판정/Rule 선택은 서버 결과만 표시함. 웹에서 부산 Rule을 추정 적용하지 않음.
- INV-006: 외부 원본·개인 계정·토큰을 Evidence에 저장하지 않음. 실제 캡처의 장소는 공개 관광정보이고 계정은 별도 H2 테스트 계정임.
- INV-007/008: 새 진단 정책 없음. 기존 인증을 유지하고 최종 계획시간을 그대로 전송함.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 추가 비즈니스 정책 결정 요청 없음. 기존 웹·인증·확정 V2 계약을 연결함.

### 개발자 결정

- 개발자가 서버 구현 후 웹에 진단 버튼이 없다는 사용 흐름의 공백을 지적함. 이를 웹 진입·결과 연결 요청으로 적용하고 현재 작업 범위를 진행 중 안내함.
- 최초 구현 시 선행 TASK-011의 실제 Codex B 리뷰·개발자 최종 승인·Commit 승인을 전달받지 않은 상태였음. 이후 실제 CHANGES_REQUIRED 수신과 수정은 10·11절에 구분해 기록함. 최종 승인·Commit 승인을 임의로 생성하지 않음.
- 2026-10-28 개발자가 TASK-011/012를 확인했고 문제가 없다고 명시하며 커밋까지 승인함. 병합·푸시 승인은 포함하지 않음.

## 8. 자동 검증 결과

### Unit Test

- Playwright 테스트 러너에서 응답 계약의 누락/오류/모순, UNKNOWN/VERIFIED 보호, 대상·좌표·coverage 검증, 초·음수 시간 표시를 실행함.
- 기존 입력 계약·활동/휴식·최종 체류시간 단위 검증과 함께 PASS. 기본 테스트의 Fixture는 테스트 파일에서만 사용함.

### Integration Test

- 웹 기본 전체: **66 passed / 8 skipped**. 실제 API 테스트는 기본 비활성화임.
- 신규 진단 합성 검증: **18 passed**(9개 시나리오 × PC/모바일). 입력 보호·로그인 닫기/실패/가입·401 재로그인·요청 오류/잘못된 응답·중복 차단·늦은 응답 무시·미확인/CRITICAL/재진단을 확인함.
- CORS 수정 후 실제 브라우저 단독: **2 passed**. 최종 전체 웹은 실제 진단 활성화 상태에서 **68 passed / 6 skipped**, 실패 0, **32.1초**. skipped 6건은 기존 TourAPI 검색 전용 live 시나리오의 환경변수를 별도로 활성화하지 않아 건너뛴 것임.
- 최종 전체 명령: 웹에서 `BUSANFIT_LIVE_WEB_DIAGNOSIS=1`, `BUSANFIT_API_TARGET=http://127.0.0.1:18080`, `BUSANFIT_WEB_BASE_URL=http://127.0.0.1:5174`, `BUSANFIT_WEB_PORT=5174` 설정 후 `npx playwright test --workers=2`.
- 실제 흐름: 별도 Vite 5174 → H2 Spring Boot 18080 → 실제 TourAPI 검색·상세 → 실제 TMAP. 외부 응답 interception 없음. PC·모바일 각각 가입/로그인, 감천문화마을 ID의 100분 계획, POSSIBLE+PARTIAL, 600분으로 수정한 재진단 ADJUSTMENT_REQUIRED+PARTIAL, 다른 diagnosisId와 경로 표시를 확인함.
- 실제 조회 시간은 실행 시 변동하며 기대값으로 고정하지 않음. 계정은 H2에만 생성됨. 격리 테스트 서버·Vite는 종료했고 5173 웹·8080 개발 서버는 실행 상태로 남김.
- 현재 일반 웹의 실제 proxy에서 Origin 127.0.0.1:5173 로그인 POST의 `{}` 입력 오류가 403 대신 **400 + 허용 Origin 헤더**로 도달함을 확인함. 개발 MySQL에 테스트 계정을 생성하지 않음.
- 서버 `.\gradlew.bat check`: **129건 중 127 passed / 2 skipped**, 실패·오류 0. 기존 TMAP 단독 live와 TASK-011 서버 live는 해당 환경변수 미활성화로 skipped이며 이번 실제 API 검증은 별도 브라우저 테스트에서 수행함. 신규 CORS 5건 PASS.

### Architecture Test

- 서버 ArchUnit 2건 포함 전체 check PASS. Domain·Rule·Port 경계 변경 없음.
- 웹은 API 호출·계약 검증·표시만 수행하고 최종 판정/시간 계산을 새로 구현하지 않았음을 자체 점검함.

### Static Analysis

- `npm run typecheck`, `npm run lint`, `npm run build` PASS.
- 서버 Checkstyle main 23개·test 11개 파일 검사, 오류·경고 0. 검사 범위는 기존 새 진단 패키지이며 SecurityConfig 등 레거시 전체 정적 분석을 의미하지 않음.
- axe의 WCAG 2A/AA·2.1AA 자동 검사에서 로그인 dialog·결과 화면 위반 0. 실제 기기/iOS Safari 검증은 아님.
- PC·모바일 실제 결과 캡처를 직접 확인함. 기본 버튼 대비·줄바꿈을 수정하고 최종 실제 캡처와 가로 넘침 테스트를 확인함.
- 당시 작업트리 전체 변경 64개(텍스트 56개·PNG 8개)의 UTF-8·개행·후행 공백·PNG header, 상대 링크 51개, TASK-012의 13개 절, 실제 API 키 미포함·비공개 설정 Git 제외·`git diff --check` 자체 검사 PASS. 기존 TASK-011과 별도 TASK-010 변경까지 읽기 검사한 수치이며 이번 Task 단독 파일 수를 의미하지 않음.

## 9. Evaluation 결과

- EVAL-205, EVAL-308: POSSIBLE과 PARTIAL을 같은 상단 영역에 표시하고 미확인 운영정보·확인 한계를 노출함.
- EVAL-301/302/304: 기존 입력 단위/화면 회귀로 최종 계획·사용자 활동시간을 보존하며 실제 검색 ID로 웹 진단에 성공함.
- EVAL-306/313: UNKNOWN+UNDETERMINED 및 미확인 시간의 계산 불가, 임의 경로 미표시를 합성 응답으로 검증함.
- EVAL-202/307/314: CRITICAL 조정 필요와 PARTIAL의 동시 표시를 합성 응답으로 검증함. 실제 운영시간·지역 통제 해석은 후속 범위임.
- EVAL-310: 표시 시간과 SVG 경로가 같은 응답의 `schedule.segments`를 사용함. 실제 브라우저에서 경로 표시와 수정·재진단을 확인함. 배경 지도·다른 길찾기 결과의 일치를 검증한 것은 아님.
- 서버 핵심 Evaluation은 기존 전체 check에서 회귀 검증함. 이번 작업에서 새 Rule이나 위험 임계값을 정의하지 않음.

## 10. Codex B Review

- 최초 리뷰 출처: 2026-10-26 개발자가 전달한 별도 Read-Only 독립 검토 결과. **최초 Review Result: CHANGES_REQUIRED**.
- P2 1건: `diagnosis.ts`가 시간 계산 완료·잔여시간 900초·REMAINING_TIME=CAUTION인데 decision=POSSIBLE인 응답을 허용함. 공통 계약 6절에 따라 이 모순을 응답 오류로 거부하고 테스트를 추가해야 함. 웹이 임의 CAUTION으로 바꾸는 방식은 사용하지 않음.
- 리뷰어의 웹 응답 계약 순수 테스트·타입 검사·ESLint·문서 검사는 통과했지만 해당 사례가 기존 테스트에 없음을 확인함. 전체 Gradle·브라우저 테스트는 재실행하지 않았고 파일을 수정하지 않음.
- 최초 종합 리뷰는 CHANGES_REQUIRED였고 TASK-010만 APPROVE였음. 이후 개발자가 현재 코드·Evidence를 다시 확인한 실제 독립 재리뷰 결과를 전달함.
- **최종 Review Result: APPROVE**. CAUTION Rule과 POSSIBLE 판정의 모순은 거부하고 정상 CAUTION 응답은 허용함을 확인함. 추가 필수 수정 사항 없음.
- 재리뷰어가 웹 응답 계약 순수 테스트 2건·웹 타입 검사·ESLint·문서 링크·공백 검사를 직접 수행해 통과함. 전체 Gradle·브라우저 테스트는 재실행하지 않았고 파일을 수정하지 않음. 11절의 Codex A 브라우저·빌드 검증과 구분함.
- TASK-011도 함께 실제 APPROVE를 수신함. 독립 리뷰 승인을 개발자 최종 확인·Commit/Merge 승인으로 확대 해석하지 않음.

## 11. Review 이후 수정사항

- 현재 응답 검증 코드와 공통 계약을 대조해 실제 누락임을 확인함. `parseDiagnosis`가 EVALUATED+CAUTION과 POSSIBLE의 조합을 거부하도록 보완함. 브라우저의 주의 임계값 재계산·판정 변경은 추가하지 않음.
- 잔여시간 900초인 일관된 합성 Fixture(이동 3900초+최종 체류 6000초=필요 9900초)를 추가함. 올바른 CAUTION과 높은 우선순위 ADJUSTMENT_REQUIRED, 시간 미확인 중 독립 주의가 있는 UNDETERMINED는 계속 허용함.
- 새 순수 회귀에서 수정 전 모순된 POSSIBLE을 거부하지 않아 실패함을 재현함. 수정 후 진단 관련 PC·모바일 **22건 PASS**. Fixture의 최종 체류를 실제 요청 100분과 일치시킨 뒤 신규 순수·브라우저 회귀 **4건**을 다시 실행해 모두 PASS함.
- 브라우저 회귀는 모순 응답을 요청 실패로 표시하고 결과 화면/임의 판정을 만들지 않으며 입력 100분을 유지하는지 검증함. 올바른 CAUTION 응답으로 재시도하면 주의+일부 확인 결과를 표시함.
- 명령: `npx playwright test tests/diagnosis.spec.ts --workers=2`, 최종 신규 회귀 `npx playwright test tests/diagnosis.spec.ts --grep 'evaluated caution' --workers=2`. `npm run typecheck`, `npm run lint`, `npm run build` PASS.
- 서버의 동반 TASK-011 수정은 `.\gradlew.bat check` **135 passed / 2 skipped** 및 Architecture·Checkstyle로 검증함. 웹 전체 검색/입력 회귀·실제 외부 API live는 이번 응답 검증 수정에서 재실행하지 않았고 8절의 이전 결과와 구분함. UI 스타일·인증·외부 호출 계약 변경이 없어 새 시각 캡처는 N/A이며 기존 캡처를 보존함.
- 관련 Evaluation: EVAL-201/205 및 공통 계약 6절의 주의 결과/최종 판정 모순 거부. 브라우저가 자체 판정을 생성하지 않는 책임 경계 유지.
- 리뷰 반영 코드·문서 9개의 UTF-8·후행 공백·개행, Evidence 절 순서·상대 링크 38개와 `git diff --check` 자체 검사 PASS. TASK-010의 수신한 실제 APPROVE도 기록하고 개발자 최종 확인 대기를 유지함.
- 실제 재리뷰 APPROVE 수신 후 본 문서와 TASK-011 Evidence의 리뷰·완료 조건·승인 대기 상태만 갱신함. 추가 코드·테스트 변경 없음. 문서 전용 갱신으로 Unit/Integration/Architecture/코드 Static Analysis/Evaluation 재실행은 N/A이며 기존 실행 결과를 유지함.
- 갱신 문서 2개의 UTF-8·후행 공백·마지막 개행·각 13개 절·상대 링크 24개·APPROVE와 최종 확인 대기 상태를 자체 검사해 PASS함.
- 2026-10-28 최종 확인·커밋 지시를 수신해 완료 상태로 갱신함. `npm test -- --workers=2` **70 passed / 8 skipped (34.3초)**, typecheck/lint/build PASS. skipped는 실제 검색 live 6건·실제 진단 live 2건의 기본 비활성화임. 서버 check는 UP-TO-DATE 성공이며 기존 **135 passed / 2 skipped** 보고서를 확인함. 새 코드 변경이나 실제 API 재호출 없이 승인된 상태를 마감함.

## 12. 최종 검증 결과

- [x] Unit Test
- [x] Integration Test — 기존 회귀·신규 합성·실제 브라우저/API 연결
- [x] Architecture Test — 서버 기존 경계 검사
- [x] Static Analysis — 웹 typecheck/lint/build·서버 제한된 Checkstyle
- [x] 관련 Evaluation 및 검증 상태 노출
- [x] Invariant Check — Codex A 자체 점검
- [x] Codex B 독립 리뷰 수신 — CHANGES_REQUIRED, 10절
- [x] 지적 사항 확인·수정·회귀 검증 — 11절
- [x] 수정 후 Codex B 재리뷰/승인 — 실제 APPROVE 수신, 10절
- [x] Developer Final Check — 2026-10-28 개발자가 확인 완료 및 커밋 승인

수정·검증·독립 재리뷰·개발자 최종 확인을 완료했으며 승인 범위는 아래 커밋 기록을 따른다.

캡처 8개: 아래 실제 API 화면 6개와 명시적으로 구분한 합성 UNKNOWN 화면 2개.

- [PC 실제 진단하기 진입](assets/TASK-012/desktop-diagnosis-live-entry.png)
- [PC 실제 일부 확인 결과](assets/TASK-012/desktop-diagnosis-live-partial.png)
- [PC 실제 초과 재진단](assets/TASK-012/desktop-diagnosis-live-overrun.png)
- [모바일 실제 진단하기 진입](assets/TASK-012/mobile-diagnosis-live-entry.png)
- [모바일 실제 일부 확인 결과](assets/TASK-012/mobile-diagnosis-live-partial.png)
- [모바일 실제 초과 재진단](assets/TASK-012/mobile-diagnosis-live-overrun.png)
- [PC 합성 UNKNOWN 검증](assets/TASK-012/desktop-diagnosis-unknown-fixture.png)
- [모바일 합성 UNKNOWN 검증](assets/TASK-012/mobile-diagnosis-unknown-fixture.png)

## 13. Commit

- Commit Hash: 이 Evidence를 포함한 커밋은 `git log -1 --oneline -- docs/V2/docs/evidence/TASK-012.md`로 확인.
- Commit Message: `feat: implement V2 diagnosis engine and web flow (TASK-011, TASK-012)`.
- 승인 범위: 2026-10-28 개발자가 최종 확인한 TASK-011/012의 코드·테스트·문서·캡처를 로컬 v2에 함께 커밋함. 공유 설정 파일을 포함한 검증된 최종 상태를 보존함.
- TASK-010 파일·기존 커밋·승인 기록은 유지함. 새 작업 규칙·TASK-013 문서는 별도 독립 리뷰 대기로 커밋에서 제외함. 병합·푸시는 수행하지 않음.
