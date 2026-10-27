# TASK-011 Evidence

상태: **완료 — Codex B 독립 재리뷰 APPROVE 및 개발자 최종 확인 완료, Commit 승인됨**.
작업일: 2026-10-26. 서버 V2 엔진·실제 장소 조회·TMAP 연결까지 구현했다. 웹 결과·지도 연결과 운영정보 보완은 후속 작업이다.

## 1. Task ID

`TASK-011`

## 2. Goal

V2 진단 엔진과 핵심 시간 규칙을 구현하고 고정 데이터로 검증한 뒤, 실제 TourAPI 검색 장소와 TMAP 이동시간을 연결해 실제 일정 진단을 확인한다.
확인할 수 없는 정보는 정상으로 대체하지 않으며 판정과 검증 상태를 별도로 제공한다.

## 3. 관련 요구사항

- 개발자가 “엔진 구현·고정 데이터 검증 → 실제 TMAP 연결 → 실제 일정 진단 확인” 흐름으로 진행하도록 지시함.
- 공통 계약의 `/api/v2/planner/diagnose`를 추가하고 기존 V1 API는 전환 기간 동안 유지함. 인증은 기존 진단과 동일하게 Bearer 토큰을 요구함.
- 최종 `plannedStaySeconds`만 합산하고 활동시간은 다시 더하지 않음. 초 단위 계산과 날짜·UTC offset을 보존함.
- 고정 방문시간 대기·지각, 일정 충돌·종료 초과, 여유시간·이동 비율 주의, 근거가 있는 권장시간 비교를 평가함.
- 외부 장애·미지원 항목을 `UNVERIFIABLE`, `coverage`, `dataReferences`로 노출하고 가능한 다른 평가는 계속함.
- 지역 Rule 선택은 Registry에서 장소별로 수행함. 지역 미확인은 전국 공통 `REGION_APPLICABILITY` 확인 불가로 남김.
- 웹 버튼·결과·지도 연결, 운영시간 해석 정책, 날씨 임계값, 부산명소정보 연결·DB 저장·주기적 갱신은 이번 구현 범위에 포함하지 않음.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md)
- [Architecture](../01-architecture.md)
- [Rules](../02-diagnosis-rules.md)
- [Invariants](../03-invariants.md)
- [Ports and Adapters](../04-ports-and-adapters.md)
- [Evaluation](../06-evaluation-set.md)
- [공통 계약](../09-diagnosis-contract.md)
- [선행 실제 검색 검증·후속 계획](TASK-010.md)
- [한국관광공사 공식 공통정보 API 명세](https://www.data.go.kr/data/15101578/openapi.do): 내장 Swagger의 `/detailCommon2` 요청 필드, `contentid`·좌표·`lDongRegnCd` 응답 필드를 확인함.
- [ArchUnit 공식 설정](https://www.archunit.org/getting-started), [Gradle Checkstyle 공식 설정](https://docs.gradle.org/current/userguide/checkstyle_plugin.html).

## 5. 변경 파일

- `apps/server/src/main/java/com/busanfit/diagnosis/domain/` 13개: Context·Evidence·시간 계산·Rule 모델·전국 공통 Rule·Registry·Engine·결과 타입.
- `apps/server/src/main/java/com/busanfit/diagnosis/application/` 및 `port/` 5개: 순수 Command, 전체 입력 검증, Context 구성, TourismPort·TravelTimePort.
- `apps/server/src/main/java/com/busanfit/diagnosis/api/` 2개: 요청 DTO와 V2 Controller. JSON 소요시간의 소수·문자열 강제 변환을 거부함.
- `apps/server/src/main/java/com/busanfit/diagnosis/adapter/` 2개: TourAPI ID 조회·서버 좌표/지역 확인, TMAP 초 단위 경로 변환·실패 처리.
- `apps/server/src/main/java/com/busanfit/diagnosis/config/DiagnosisConfiguration.java`: Clock·Engine 구성, 기본 1800초·0.4 임계값의 내부 설정.
- `apps/server/src/main/java/com/busanfit/global/external/tmap/TmapClient.java`: 음수·소수·범위 초과 요약 숫자 거부, 경로 좌표의 숫자형·범위 확인. 분 값은 V1 호환용으로 유지하고 V2는 초 값만 사용함.
- `apps/server/src/test/java/com/busanfit/diagnosis/` 9개: 고정 Context Evaluation, Registry·집계, 응용 계층, Adapter, API 계약, Architecture, 실제 HTTP/API 검증과 공용 Fixture.
- `apps/server/src/test/java/com/busanfit/global/external/tmap/TmapClientTest.java`: 잘못된 요약 숫자 회귀 테스트 5건 추가.
- `apps/server/build.gradle`, `apps/server/config/checkstyle/checkstyle.xml`: ArchUnit과 진단 패키지 대상 Checkstyle 구성. 실제 진단 테스트 활성화 여부를 Gradle 입력으로 기록해 기본 실행의 skipped 결과가 활성화 실행에 재사용되지 않게 함.
- `apps/server/README.md`: 요청 예시, 실패·지원 범위, 실제 API 검증 명령.
- 본 Evidence. 웹·모바일·비공개 설정·DB 스키마는 변경하지 않음.

## 6. Codex A 주요 판단

### 구현 방식

- 변경 전 문서·기존 진단을 대조함. 기존 진단의 하드코딩 Catalog, 기본 체류+활동 재합산, 구간별 분 올림, 단일 status/feasible, 날짜 소실은 V2 계약과 다르므로 V2를 별도 경로로 구현함.
- 실제 서비스의 이동 근거는 TMAP에서 받음. 고정 Context는 로직의 재현 가능한 검증에만 사용하며 제품 코드에서 합성 데이터로 대체하지 않음.
- 모든 요청의 날짜·시간·좌표·ID 형식·중복·활동·소요시간·timestamp 표현 가능성을 외부 호출 전에 검증함. 전체 장소를 먼저 조회해 확인된 없는 ID로 불필요한 경로 호출을 하지 않음.
- `TourismPort`는 검색과 같은 `tourapi-{contentid}` ID를 `/detailCommon2`로 확인함. 서버가 조회한 장소 좌표와 법정동 시도코드를 사용하며 이름·주소로 지역을 추정하지 않음.
- TMAP 결과는 초·미터·내부 경로 좌표로 변환함. `rawResponse`와 외부 오류 메시지는 V2 Domain·응답·저장소에 전달하지 않음. 빈 경로·잘못된 값·통신 실패는 이동 불가/가능으로 확정하지 않음.
- 알려지지 않은 장소의 인접 구간은 좌표 미확인으로 남김. 이후 두 장소의 좌표가 확인되면 그 구간 조회는 계속하지만 앞선 미확인 이후의 예상시각은 다시 생성하지 않음.
- 운영시간·날씨는 장소별 미지원 결과, 권장시간은 근거·활동 포함 범위 미확인 결과로 남김. 해당 지역 통제 구현이 없으면 Registry가 그 지역 장소에만 REGION Scope의 미지원 항목을 선택함.
- Rule 결과는 등록된 ID·Scope·Importance·target과 일치해야 함. 같은 Rule·target의 독립 조건은 별도 결과로 보존할 수 있음.

### 기존 구조와의 관계 / 구현 전 검증

- 핵심 판단은 `diagnosis.domain` 내부에 둠. Domain은 JDK·자체 타입만 의존하며 Spring·Jackson·외부 Client·JPA를 참조하지 않음. 응용 계층은 Port를 통해 조회함.
- 기존 Rule 의미·Scope·집계 정책을 변경하지 않음. 날씨 위험 기준·운영시간 경계 해석·새 이동 불가 정책을 임의로 정의하지 않음.
- INV-001/004/009: 이동 미확인 이후 예상시각·정확한 총시간·잔여시간은 null/계산 불가. 확인된 조정 필요가 없으면 UNDETERMINED이며 체류 합계 등 독립적으로 증명된 초과는 유지함.
- INV-002: 확인된 조정 필요는 미확인·PASS·CAUTION으로 상쇄되지 않음. CRITICAL 미확인 자체를 위반으로 생성하지 않음.
- INV-003: 혼합 지역 일정에서 부산 Scope는 부산 장소에만 실행함. 미확인 지역은 특정 지역 Rule을 실행하지 않음.
- INV-005: 판정과 검증 상태·근거·coverage를 함께 응답함. 실제 시간 계산 성공도 현재 미지원 항목이 있으므로 PARTIAL임.
- INV-006: 결과는 응답으로 반환하며 이번 작업에서 DB 저장을 추가하지 않음. 외부 원본·전체 일정·정확한 경로를 새 운영 로그로 기록하지 않음.
- INV-007/008: 확정 계약의 정책을 사용하고 plannedStaySeconds 외 시간 재합산 없음. rest/other 사용자 지정시간은 그대로 활동 합계에 기록함.

### 구현 중 발견한 문제 / 한계

- 기존 TMAP 파서가 소수를 정수로 변환하거나 경로 좌표의 문자열을 숫자로 변환할 수 있었음. 숫자형·정수·범위 검증을 보완하고 회귀 검증함.
- 운영시간 파서와 지역 통제·날씨의 실제 판정은 미구현임. 해당 정보의 확인 불가를 숨기지 않는 구조와 집계만 구현함.
- `recommendedTotalStaySeconds`는 근거와 활동 포함 범위가 확인된 총시간을 받는 Domain 경계임. 실제 장소 조회에서는 해당 근거가 없어 항상 확인 불가이며 검색 DTO의 레거시 90분을 사용하지 않음.
- Checkstyle은 새 진단 패키지의 기본 정적 검사에 한정됨. 레거시 전체 검사·포괄적인 결함 분석 도구 도입을 완료한 것으로 간주하지 않음. 기존 및 신규 Jackson 호환 API의 deprecated 경고는 남음.
- 기존 웹의 “입력 확인” 버튼은 아직 진단 API를 호출하지 않음. `schedule.segments`는 지도 연결용 같은 진단 스냅샷이며 실제 지도 표시 검증은 후속 작업임.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 추가 정책 결정 요청 없음. 승인된 계약·TASK-008/009의 범위 제한과 이번 개발자의 실행 지시를 적용함.

### 개발자 결정

- 이번 대화에서 핵심 엔진 고정 데이터 검증 후 실제 TMAP 연결·실제 일정 진단 확인 흐름으로 진행하도록 명시함.
- 부산명소정보 연결·저장·갱신의 미정 기준은 TASK-010 후속 계획에 유지함. 이번 작업에서 확정하지 않음.
- 2026-10-28 개발자가 TASK-011/012를 확인했고 문제가 없다고 명시하며 커밋까지 승인함. 병합·푸시 승인은 포함하지 않음.

## 8. 자동 검증 결과

### Unit Test

- Domain 고정 Evaluation/Registry·집계 24건, 응용 계층 5건, 새 Adapter 22건 PASS.
- TMAP 기존 단위 테스트에 잘못된 요약 숫자 5건을 추가했고 기존 테스트와 함께 PASS.
- 명령: `apps/server`에서 `.\gradlew.bat check`.

### Integration Test

- V2 MockMvc API 계약 15건 PASS. 인증, 검색 ID, 날짜·초 단위 계산, rest 45분·other 75분 유지, 계획시간 중복 합산 방지, 경로 스냅샷, 400과 외부 장애의 구분, 잘못된 입력의 외부 호출 방지를 확인함.
- 기본 전체 검증: **124건 중 122 passed / 2 skipped**, 실패·오류 0. 기존 TMAP 단독 live 테스트와 새 V2 live 테스트는 환경변수 미활성화로 skipped임.
- 최종 실제 API 활성화 전체 검증: **124건 중 123 passed / 1 skipped**, 실패·오류 0. 기존 TMAP 단독 live 테스트만 `TMAP_APP_KEY` 프로세스 환경변수 미설정으로 skipped이며, 새 V2 live 테스트는 로컬 비공개 설정으로 실제 TMAP 호출에 성공함.
- 최종 명령: `$env:BUSANFIT_LIVE_DIAGNOSIS='1'; .\gradlew.bat check`. 활성화 여부 변경으로 테스트가 실제 재실행됨을 확인함.
- 실제 검증: 임시 포트 **61611**의 Spring Boot HTTP endpoint → 실제 TourAPI 상세 → 실제 TMAP. 실제 TourAPI 검색에서 감천문화마을 `tourapi-1997221`을 얻어 진단에 사용함. 외부 mock·interception 없음.
- 최종 실행에서 이동 **917초**, 최종 체류 **3600초**, 정확한 필요시간 **4517초**, `POSSIBLE + PARTIAL`을 확인함. 동일 장소 체류 **36000초** 요청은 `ADJUSTMENT_REQUIRED + PARTIAL`임. 이동시간 수치는 조회 시점 값으로 고정 기대값이 아님.
- 별도 H2 datasource와 테스트 인증 토큰 사용을 확인함. 기존 8080 서버·개발 MySQL을 재시작하거나 수정하지 않음. 테스트 서버는 종료됨.
- 웹·모바일 테스트: N/A. 해당 코드를 변경하지 않았고 이번 실제 검증은 서버 HTTP 경로이며 브라우저 동작 검증이 아님.

### Architecture Test

- ArchUnit 2건 PASS: Domain의 JDK·자체 타입 외 의존 금지, 응용/API의 Adapter·외부 Client 직접 의존 금지, 응용→API 의존 금지, V1 진단 서비스 의존 금지.
- 명령: `.\gradlew.bat check`에 포함됨.

### Static Analysis

- Checkstyle main **23개**, test **9개** 파일 검사, 오류·경고 0. 명령: `.\gradlew.bat check`의 `checkstyleMain`, `checkstyleTest`.
- 컴파일과 전체 Gradle check PASS. Checkstyle은 설정한 기본 검사 범위에 한정되며 deprecated API 경고가 없다는 뜻이 아님.
- 변경 파일 38개 UTF-8·마지막 개행·후행 공백, 상대 문서 링크 11개, Evidence 13개 절, 비공개 설정 Git 제외, 변경 파일의 실제 API 키 미포함을 자체 확인함. `git diff --check` PASS.

## 9. Evaluation 결과

고정 Fixture/Stub는 테스트에서만 사용한다. 아래는 실제 실행한 검증 범위이며 미구현 데이터 해석·웹 연결까지 통과한 것으로 확대하지 않는다.

| Case | 실행·확인 범위 |
|---|---|
| EVAL-001/002/003/005 | 시간상 정상·고정 방문 지각·권장 총시간 부족·일정 충돌, 임계값 경계 |
| EVAL-101/102, EVAL-201~204 | 이동/장소 조회 실패, UNKNOWN 안전 처리 방지, CRITICAL 집계, Scope 격리, 입력 보호 |
| EVAL-301~303 | 계획 체류 100분 유지, rest 45분·other 75분 유지, 이동 61초×2=122초 |
| EVAL-304 | 실제 검색 ID로 TourAPI 상세·V2 진단 성공 |
| EVAL-305/306/308 | 조기 대기·지각, 이동 미확인 판정 불가, 시간 계산 성공과 미확인 운영정보의 PARTIAL |
| EVAL-309/312~314 | 혼합 지역별 선택, 미확인 지역의 전국 공통 확인 불가, UNKNOWN/PARTIAL·조정 필요 유지 |
| EVAL-315/316 | 체류만으로 증명된 초과 유지, 미확인 이동의 0초 대체 금지·총시간 계산 불가 |
| EVAL-317 | 권장시간의 근거·활동 포함 범위 미확인 시 임의 합산·주의 생성 없이 시간 계산 유지 |
| EVAL-307/311/319 | 테스트 Rule로 주어진 확인된 위반과 독립 조건/대상 확인 불가의 집계 경계. 실제 운영시간 해석은 미구현 |
| EVAL-318/320 | 운영정보·적용 범위 미확인의 UNVERIFIABLE 노출과 근거 없는 위반 생성 방지. 실제 휴게시간 파서·공식 통제 Adapter 검증 아님 |
| EVAL-321 | 확인된 조회 시점 이동시간 사용. 제한된 테스트 Rule 집합에서는 POSSIBLE+VERIFIED를 검증하며, 실제 서비스는 미지원 항목 때문에 PARTIAL임 |
| EVAL-322 | 통신 실패·빈 경로·잘못된 경로 값의 미확인 처리, 0초·이동 가능/불가 대체 없음 |

- EVAL-004/006의 실제 운영시간·날씨 데이터 해석, EVAL-103/104의 실제 날씨·지역 API 장애, EVAL-205의 화면 노출, EVAL-310의 실제 지도 일치는 후속 검증 대상임. API의 검증 상태·경로 스냅샷 제공만 이번에 확인함.
- Coverage는 전국 공통 미지원 항목, 확인된 지역의 통제 미지원, 지역 미확인 이유를 응답에 남김.

## 10. Codex B Review

- 최초 리뷰 출처: 2026-10-26 개발자가 전달한 별도 Read-Only 독립 검토 결과. **최초 Review Result: CHANGES_REQUIRED**.
- P2 1건: `CoreRules.EndTime`이 09~12시 일정에서 확인된 첫 이동 2시간 30분·첫 체류 30분 후, 미확인 두 번째 이동과 남은 체류 30분을 고려한 증명 가능한 초과를 놓침. 기존 결과 UNDETERMINED+PARTIAL을 ADJUSTMENT_REQUIRED+PARTIAL로 보완해야 함.
- 관련 기준: 공통 계약 4·6절, INV-009. 정확한 총시간·잔여시간은 여전히 계산 불가로 유지해야 함.
- 리뷰어는 기존 컴파일 산출물로 Domain 테스트 24건을 재실행해 통과했으나 이 사례가 기존 테스트에 없음을 확인함. 전체 Gradle·브라우저 테스트는 재실행하지 않았고 파일을 수정하지 않음.
- 아래 수정·재검증은 Codex A가 수행했으며, 이후 개발자가 현재 코드·Evidence를 다시 확인한 실제 독립 재리뷰 결과를 전달함.
- **최종 Review Result: APPROVE**. 이전 시간 초과 사례가 ADJUSTMENT_REQUIRED+PARTIAL로 판정되고 미확인 총시간·잔여시간이 null로 유지됨을 확인함. 추가 필수 수정 사항 없음.
- 재리뷰어는 기존 컴파일 산출물의 서버 Domain 테스트 31건과 문서 링크·공백 검사를 직접 재검증해 통과함. 전체 Gradle·브라우저 테스트는 재실행하지 않았고 파일을 수정하지 않음. 11절의 Codex A 전체 check 결과와 구분함.
- 이번 APPROVE는 수정된 TASK-011 코드·Evidence의 독립 리뷰 결과임. 개발자 최종 확인·Commit/Merge 승인으로 확대 해석하지 않음.

## 11. Review 이후 수정사항

- 현재 코드·공통 계약과 대조해 실제 누락임을 확인하고 반영함. 새로운 Rule 의미·정책·응답 필드를 추가하지 않음.
- `CoreRules.EndTime`이 확인된 이동시간·최종 체류시간·고정 방문시간으로 종료시각의 하한을 전파해 초과를 증명함. 이미 지난 체류를 다시 더하지 않으며, 미확인 구간 이후 확인된 이동·고정 방문 제약도 독립적인 근거로 사용함.
- 하한은 위반 증명에만 사용하고 예상시각·정확한 총 필요시간·잔여시간으로 반환하지 않음. `ScheduleCalculator`의 미확인 이후 null·계산 불가 처리는 변경하지 않음. 하한이 종료시각 이하라는 사실만으로 PASS/POSSIBLE을 생성하지 않음.
- Domain 회귀 7건 추가: 리뷰 사례, 종료 경계/미초과의 UNDETERMINED 유지, 미확인 구간 뒤 확인된 이동, 확인된 대기와 남은 체류, 미확인 이후 고정 방문과 남은 체류, 완료된 체류/대기 중복 합산 방지. API 계약 회귀 1건으로 ADJUSTMENT_REQUIRED+PARTIAL 및 정확한 시간 null을 검증함.
- 수정 전 새 매개변수 회귀 4건 중 초과 사례 2건이 실패해 문제를 재현함. 수정 후 `apps/server`의 `.\gradlew.bat check` **137건 중 135 passed / 2 skipped**, 실패·오류 0. Domain Evaluation/Registry **31건**, V2 API 계약 **16건**, Architecture **2건**, Checkstyle main/test PASS.
- skipped는 기존 TMAP 단독 live·서버 진단 live의 환경변수 미활성화임. 이번 수정은 외부 Adapter·API 호출 계약을 바꾸지 않아 실제 외부 API·브라우저 live 재실행은 N/A이며, 8절의 기존 실제 API 검증과 구분함.
- 관련 Evaluation: EVAL-315/316의 확인된 근거만으로 초과 증명·정확한 시간 계산 불가 유지 범위를 확대 검증함. 기존 INV-001/004/008/009 동작도 회귀 검증함.
- 리뷰 반영 파일 9개 UTF-8·후행 공백·마지막 개행, 관련 Evidence 3개의 13개 절·상대 링크 38개와 `git diff --check` 자체 검사 PASS. 비공개 설정 Git 제외 유지.
- 실제 재리뷰 APPROVE 수신 후 본 문서와 TASK-012 Evidence의 리뷰·완료 조건·승인 대기 상태만 갱신함. 추가 코드·테스트 변경 없음. 문서 전용 갱신으로 Unit/Integration/Architecture/코드 Static Analysis/Evaluation 재실행은 N/A이며 기존 실행 결과를 유지함.
- 갱신 문서 2개의 UTF-8·후행 공백·마지막 개행·각 13개 절·상대 링크 24개·APPROVE와 최종 확인 대기 상태를 자체 검사해 PASS함.
- 2026-10-28 개발자 최종 확인·커밋 지시를 수신해 완료 상태로 갱신함. 커밋 전 `.\gradlew.bat check`는 성공했으며 모든 태스크가 UP-TO-DATE여서 테스트를 새로 실행하지 않음. 보존된 보고서의 **135 passed / 2 skipped**를 확인함. 웹 전체 기본 회귀 **70 passed / 8 skipped**, typecheck/lint/build도 통과함. 실제 API live는 이번 마감에서 재실행하지 않음.

## 12. 최종 검증 결과

- [x] Unit Test
- [x] Integration Test — V2 계약 및 실제 TourAPI·TMAP·HTTP 검증
- [x] Architecture Test
- [x] Static Analysis — 새 진단 패키지 Checkstyle
- [x] 관련 Evaluation — 9절의 실행 범위에 한함
- [x] Invariant Check — Codex A 자체 점검
- [x] Codex B 독립 리뷰 수신 — CHANGES_REQUIRED, 10절
- [x] 지적 사항 확인·수정·회귀 검증 — 11절
- [x] 수정 후 Codex B 재리뷰/승인 — 실제 APPROVE 수신, 10절
- [x] Developer Final Check — 2026-10-28 개발자가 확인 완료 및 커밋 승인

수정·검증·독립 재리뷰·개발자 최종 확인을 완료했으며 승인 범위는 아래 커밋 기록을 따른다.

## 13. Commit

- Commit Hash: 이 Evidence를 포함한 커밋은 `git log -1 --oneline -- docs/V2/docs/evidence/TASK-011.md`로 확인.
- Commit Message: `feat: implement V2 diagnosis engine and web flow (TASK-011, TASK-012)`.
- 승인 범위: 2026-10-28 개발자가 최종 확인한 TASK-011/012의 코드·테스트·문서·캡처를 로컬 v2에 함께 커밋함. 공유 설정 파일을 포함한 검증된 최종 상태를 보존함.
- TASK-010 파일·기존 커밋·승인 기록은 유지함. 새 작업 규칙·TASK-013 문서는 별도 독립 리뷰 대기로 커밋에서 제외함. 병합·푸시는 수행하지 않음.
