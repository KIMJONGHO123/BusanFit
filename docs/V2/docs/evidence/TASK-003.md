# TASK-003 Evidence

상태: **완료 — Codex B 독립 리뷰 APPROVE 및 개발자 최종 확인 완료**.
조사일: 2026-10-20. 실행 코드 변경·런타임 검증·V2 구현 완료를 의미하지 않는다.

## 1. Task ID

`TASK-003`

## 2. Goal

확정된 모바일·서버 공통 진단 명세와 현재 코드를 비교하여 V2 구현 전 기준선을 기록한다.
TASK-002의 정책을 재결정하지 않으며 TASK-001 Domain 구현은 수행하지 않는다.

## 3. 관련 요구사항

- 로드맵 Phase 0: 기존 진단 코드·외부 연동·저장 모델·테스트와 V2의 차이 확인.
- 유지할 기능, V2에서 교체할 판단 구조, 후속 구현 경계를 구분.
- 미구현과 확인 불가를 안전·검증 완료로 취급하지 않음.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md), [모바일 AGENTS.md](../../../../apps/mobile/AGENTS.md)
- [Architecture](../01-architecture.md), [Rules](../02-diagnosis-rules.md), [Invariants](../03-invariants.md)
- [Ports and Adapters](../04-ports-and-adapters.md), [Evaluation](../06-evaluation-set.md)
- [Roadmap](../08-implementation-roadmap.md), [확정 계약](../09-diagnosis-contract.md)
- [TASK-001](TASK-001.md), [TASK-002](TASK-002.md)

## 5. 변경 파일

- `docs/V2/docs/evidence/TASK-003.md`만 추가. 코드·기존 명세·TASK-001의 완료 상태는 변경하지 않음.

## 6. Codex A 주요 판단

### 조사 범위와 실제 흐름

서버 Java 소스·테스트, 모바일 planner/API 소스·테스트, 서버 Gradle 설정, 모바일 package.json, 루트 SQL을 확인했다.
작업 시작 시 `git status --short` 출력은 없었다.

현재 모바일 흐름:

```text
places.tsx → /api/places/search → TourApiClient
          → 검색 결과 없거나 데이터 미수신 시 mockPlaces
선택 장소·출발 좌표 → useScheduleRoutes → /api/tmap/car-route
result.tsx → 모바일 diagnoseSchedule → feasible 표시
map.tsx → 같은 useScheduleRoutes 캐시로 지도 표시
```

서버의 기존 `/api/planner/diagnose`도 존재하지만 현재 모바일 결과 화면은 이를 호출하지 않는다.
서버 진단은 `PlannerDiagnosisService → PlannerPlaceCatalog(3곳) + TmapClient` 흐름이다.
V2 Domain·Registry·Engine·검증 상태 집계는 현재 구현되어 있지 않다.

### 명세와 현재 구현 차이

아래 파일 경로는 저장소 루트 기준이다. 차이는 V2 전환 시 필요한 변경이며 기존 V1 API의 계약 위반으로 단정하지 않는다.

| 항목 | 현재 구현 및 근거 | V2에서 필요한 변경 |
|---|---|---|
| 최종 판단 책임 | `apps/mobile/src/app/planner/result.tsx`가 `features/planner/diagnose.ts`를 직접 호출. 서버도 별도 진단 수행 | Domain이 최종 판단하고 앱은 서버 결과 표시 |
| Domain 경계 | `apps/server/src/main/java/com/busanfit/planner/PlannerDiagnosisService.java`에 시간·운영·주의·집계 혼재. TmapClient와 외부 DTO 직접 사용 | 입력/외부 조회/Context 구성은 응용 계층, 판단은 Domain, 외부 연결은 Port/Adapter로 분리 |
| 요청 계약 | `DiagnoseScheduleRequestDto`: date/startLocation/places. 장소 요청은 ID와 활동 enum 목록 | V2의 travelDate/departure/stops, timeZone, transportMode, plannedVisitTime, plannedStaySeconds, 활동별 사용자 시간 입력 지원 |
| 체류시간 | 서버는 기본 권장+활동, 앱도 stayMinutes+activityMinutes로 계산. 최종 확정 체류시간 입력 구조 없음 | 기본 권장·활동·최종 계획을 분리. 일정에는 최종 plannedStaySeconds만 반영(INV-008). 현재 코드가 V2 최종 체류시간을 실제로 중복 합산했다고 단정할 수는 없음 |
| 활동 정책 | 서버 ActivityType과 앱 activities.ts에 시간표 중복. OTHER 서버 고정 30분. 앱 PlaceActivity는 minutes를 담을 수 있음 | 일반 활동 정책 서버 조회, 기타 활동 사용자 durationSeconds 검증·유지, 중복 활동 거부 |
| 초 단위 | TmapClient가 초와 올림 분을 반환. 서버 진단은 totalTimeMinutes를 사용. 앱은 totalTimeSeconds로 계산 | 서버 계산을 초/Duration으로 전환. 각각 61초인 두 구간은 122초. 현재 서버 경로에서는 2분+2분으로 반영됨 |
| 고정 방문시간 | 서버·앱 모두 도착 즉시 체류. 요청·상태에 고정 방문시간 없음 | 이른 도착 대기·늦은 도착 조정 필요·고정 방문 간 충돌 반영 |
| 날짜 보존 | 서버 LocalDateTime 계산 후 toLocalTime 문자열 반환. 앱은 다음 날 문구를 붙이나 날짜·offset 없음 | 예상시각에 날짜와 offset 보존, 자정 초과를 같은 날 시각으로 오인하지 않게 처리 |
| 결과 계약 | 서버 DiagnosisStatus + feasible, 앱 feasible. verificationStatus/ruleResults/coverage/dataReferences 없음 | decision 4종과 검증 상태 3종 분리, 대상별 RuleResult·근거·미지원·기준시각 반환 |
| 외부 실패 | TMAP 예외는 서버 GlobalExceptionHandler에서 502로 종료. 앱은 failed 구간이 있으면 진단 계산을 거부 | 실패는 관련 항목 UNVERIFIABLE, 가능한 다른 평가 계속. UNDETERMINED와 확인된 ADJUSTMENT_REQUIRED 우선순위 적용(INV-001/009) |
| 실패 구간 수치 | 앱 route-segments.ts 예외 처리에 0 값이 있지만 status=failed. 진단은 failed를 거부하고 지도는 성공 구간만 합산하며 일부 실패 안내 | 현재 0 값이 안전 판정에 쓰인다고 단정하지 않음. V2는 계산 불가 값을 명시하고 후속 예상시각·총합에 0 대입 금지 |
| 공통 장소 ID | TourApiClient는 tourapi-{contentid}, PlannerPlaceCatalog는 place-로 시작하는 고정 3개 ID만 조회 | 검색·진단 공통 ID 조회 및 원본 ID 매핑 필요. 현재 검색 ID를 기존 진단 API에 넣으면 지원하지 않는 ID로 400 |
| 검색 실패/빈 결과 | 앱 places.tsx의 data?.length 조건이 빈 결과·초기 미수신·오류의 데이터 없음 모두 mockPlaces로 대체. 오류 시 임시 목록 안내는 있음 | 실패·빈 결과·로딩 구분, 서비스 흐름의 mock 자동 대체 제거 |
| 입력 보호 | 서버 날짜 파싱·시작/종료 순서·필수값 검증 존재. StartLocationDto는 좌표 NotNull만 검사. TmapClient에는 별도 좌표 검증 있음 | API 입력 단계 범위·엄격한 HH:mm·양의 체류·중복 장소/활동·고정 방문 범위·지원 코드 검증. 하위 클라이언트 검증 존재와 입력 경계 완성을 구분 |
| 운영·권장 근거 | Catalog에 고정 운영시간·권장시간. TourApiClient는 모든 검색 장소에 기본 90분. 실제 운영 조회 없음 | 데이터 출처·확인 상태 분리. 근거 없는 권장 비교·운영 판단은 UNVERIFIABLE |
| 날씨 | 서버는 야외+날씨 민감 활동이면 일반 경고. 기상 조회 구현 없음. 모바일은 결과에 날씨 등 미반영 안내 | 일반 경고를 검증된 날씨 위험으로 사용하지 않음. 별도 정책 정의 전 미지원 노출 |
| 지역·중요도 | 검색은 부산 areaCode=6 고정. Domain Scope/Importance/Registry/지역 확인 결과 없음 | 전국 공통/지역 Rule 분리, 혼합 일정에서 장소 단위 선택, REGION_APPLICABILITY 확인 불가 집계, CRITICAL 우선 반영 |
| 경로 스냅샷 | 결과·지도는 같은 queryKey와 staleTime=Infinity 캐시 공유. diagnosisId는 앱 고정 tmap-schedule | 기존 공유 의도 유지. 서버 diagnosisId와 경로·재진단 결과를 함께 연결. 캐시 공유만으로 V2 계약 완료라 볼 수 없음 |
| 외부 원본 | TmapCarRouteResult에 rawResponse 포함. TmapRouteController가 해당 record를 직접 반환하며 별도 제외 어노테이션 없음 | V2 응답·저장 모델에서 원본 제외. 기존 경로 API도 별도 응답 DTO 전환 대상으로 기록(INV-006). 실제 네트워크 응답 캡처는 미수행 |

### 저장 모델 기준선

- 서버 실행 소스에서 확인한 JPA Entity/Repository는 사용자 모듈이다. planner/place/saved에 일정·진단 저장 구현은 확인되지 않는다.
- `db테이블.sql`에는 places/activities/trips/trip_stops/stop_activities/diagnoses/diagnosis_items 설계가 있으나 현재 DB 적용 여부는 확인하지 않았다.
- SQL의 diagnoses는 feasible와 분 단위, diagnosis_items는 TIME 및 분 단위 중심이다. V2의 검증 상태·대상별 Rule 결과·날짜/offset·계산 불가·근거를 그대로 표현할 수 없다. 저장 단계에서 별도 마이그레이션 설계가 필요하다.
- 외부 원본을 DB에 실제 저장하고 있다는 증거는 발견하지 않았다. 원본 DTO 포함과 원본 저장을 구분한다.

### 유지·재사용할 부분

- 인증 및 기존 `/api/planner/diagnose` 계약 테스트는 V1 회귀 기준으로 유지할 수 있다.
- TMAP HTTP 호출·응답 파싱·초/거리/좌표 추출·좌표 검증·실패 테스트는 Adapter 구현 기반으로 재사용한다. Domain으로 DTO와 원본을 전달하지 않는다.
- TourAPI 검색 호출·파싱은 재사용하되 공통 ID 조회, 권장시간 출처, 지역·운영정보 모델은 보완한다.
- 앱의 출발지→첫 장소 구간, 실패 시 최종 계산 거부, 경로 캐시 공유, TMAP 조회시점 안내는 유지할 동작이다.
- 앱은 현재도 운영시간·휴무·날씨 미반영을 문구로 알린다. 이를 완전히 숨긴다고 평가하지 않으며 V2의 구조화된 검증 상태 표시가 추가로 필요하다.

### 기존 테스트와 검증 공백

- `PlannerDiagnosisServiceTest`: 첫 이동+활동 합산, 운영 종료 충돌, 시간 역전 거부. WithoutRounding이라는 테스트명과 달리 fixture가 1800초/30분이므로 61초 구간 올림을 검증하지 않는다.
- `PlannerDiagnosisApiContractTest`: 기존 API 인증·타임라인·WARNING/feasible 응답. V2 계약 테스트가 아니다.
- `TmapClientTest`: 요약·좌표 파싱, 좌표 매핑, 필드 누락, HTTP 오류, 잘못된 좌표. LiveTest도 있으나 이번에는 실행하지 않았다.
- 모바일 schedule-diagnosis 테스트: 첫 이동, 초 단위 경로 일치, 1초 초과·자정, 경로 누락/실패/순서, 캐시 공유. map-route-contract/tmap-document 테스트도 존재한다.
- 기존 테스트 일부는 V1의 기본+활동 합산과 feasible을 기대한다. V1 회귀 테스트와 V2 신규 테스트를 구분해야 한다.
- 서버 build.gradle에는 Architecture Test 도구 및 Checkstyle/PMD/SpotBugs 설정이 없다. 기존 도구 검색 및 테스트 목록에서도 V2 Architecture/Evaluation 자동화는 확인되지 않았다.
- V2의 결과 집계·Scope·CRITICAL·부분 실패·최종 체류시간·공통 ID·지역 미확인 EVAL-301~314는 향후 자동화 대상이다. 문서 사례 존재를 통과로 기록하지 않는다.

### 다음 구현 경계 제안

1. TASK-001에서 기존 planner API와 분리된 `com.busanfit.diagnosis.domain`을 후보 경계로 삼는다. 구체 패키지는 구현 전 확정하며 이번 조사로 구조 변경을 시행하지 않는다.
2. 외부 SDK/HTTP/JPA 없이 Context, 결과 타입, 대상별 평가 상태, Scope, Registry, Engine 집계를 구현·검증한다. 미지원 항목을 누락하여 VERIFIED가 되지 않도록 검증 범위를 명시한다.
3. 시간·체류·충돌 Rule 구현 후 Port/Adapter, 공통 장소 조회와 V2 API, 모바일 전환을 순차 진행한다. TASK-001에서 이를 한꺼번에 구현하지 않는다.

## 7. 구현 전 개발자 판단 요청

- 이번 조사에는 신규 정책 결정 요청 없음. 확정 명세와 상위 문서 사이에서 작업을 막는 정책 충돌은 발견하지 않았다.
- 날씨 임계값은 이미 명세에서 별도 정책 작업으로 유보되어 있다. 임의 정의하지 않는다.
- 지역 코드 체계·장소 ID 매핑/보관 방식·권장 체류시간 출처·저장 마이그레이션 방식은 해당 구현 시 구체화할 사항이다. 이번 작업에서 새 정책으로 확정하지 않는다.
- 사용자 지시: “1번 확인해줘”. 코드 기준선 조사만 수행했다.
- 2026-10-21 개발자가 실제 Codex B 최종 APPROVE 전달 후 “ㅇㅋ 승인”으로 TASK-003 최종 확인을 승인했다. 승인 범위는 기준선 조사와 Evidence이며 TASK-001 구현 완료를 의미하지 않는다.

## 8. 자동 검증 결과

- Unit Test: N/A. 코드 수정 없는 정적 조사이며 기존 테스트를 실행하지 않았다.
- Integration Test: N/A. 실행 코드 변경 없음. 실제 외부 API/DB/앱 구동 검증을 하지 않았다.
- Architecture Test: N/A. 코드 변경 없음. 의존 관계를 소스로 확인했으며 자동 Architecture Test 통과를 주장하지 않는다.
- Static Analysis: 코드 분석기 실행 N/A. 문서 로컬 링크 존재·후행 공백 검사 및 `git diff --check` 자체 검증 수행.

## 9. Evaluation 결과

- 실행 Case: N/A. 엔진 구현 없는 조사 작업으로 EVAL 실행 안 함.
- 결과: 기존 테스트의 확인 범위와 V2 평가 공백을 6절에 기록. EVAL 통과 상태 변경 없음.

## 10. Codex B Review

- 출처: 2026-10-21 개발자가 별도 Codex B 세션의 독립 리뷰 결과라고 명시하여 전달한 내용. Codex A 자체 검토나 내부 에이전트 검토가 아니다.
- 실제 결론: 필수 수정 사항 없음. 기준선 분석과 후속 구현 방향이 적절하며 TASK-001 Domain 골격 구현 진행 가능.
- 최종 리뷰 결과: **APPROVE**. 개발자가 같은 날 추가 전달한 리뷰 마지막 문구에서 확인했다. 항목별 PASS / FAIL은 원문에 없어 추가하지 않는다.

전달된 리뷰의 핵심 원문:

> 필수 수정 사항은 발견하지 못했습니다. TASK-003의 기준선 분석과 후속 구현 방향은 적절하며, 이를 바탕으로 TASK-001 Domain 골격 구현을 진행해도 됩니다.

> 다만 TASK-003은 상세 테스트 계획까지 정의한 문서는 아니므로, TASK-001 시작 시 집계·Scope·빈 평가 결과에 대한 검증 사례를 구체화해야 합니다.

> 최종 리뷰 결과: APPROVE

추가 전달된 후속 제안(현재 조사 문서의 승인을 막는 사항 아님):

- TASK-001: 빈 Rule 목록, 모든 항목 확인 불가, PASS와 UNVERIFIABLE 혼재, 확인된 조정 필요와 시간 계산 불가 혼재, 혼합 지역·지역 미확인을 고정 Context로 검증한다. 확정 계약 6절의 집계 정책과 기본값을 확인한다.
- 후속 Rule 작업: 기존 여유시간 30분·이동 비율 40% 정책을 명시적으로 이전한다. 확정 계약에 따라 내부 설정으로 관리하고 경계값을 검증한다.
- Adapter 작업: TMAP 음수 시간·거리, TourAPI 비유한·범위 밖 좌표 등 비정상 외부 응답 fixture를 추가한다. 기존 파싱 재사용이 응답 검증 완료를 의미하지 않는다.
- Codex A는 소스 재확인으로 TmapClient.readRequiredInt의 음수 거부 부재와 TourApiClient.readDouble의 유한성·범위 검사 부재를 확인했다. 해당 코드 수정·테스트 실행은 이번 문서 갱신 범위에 포함하지 않았다.

리뷰 범위는 Phase 0 조사 결과와 구현 경계 제안이다. V2 전체 상세 구현·테스트 계획의 승인으로 확대 해석하지 않는다.
리뷰에서 언급된 모바일 3개 파일의 주석 변경은 별도 작업이다. 이번 Evidence 갱신에서는 해당 파일을 수정하지 않는다.

## 11. Review 이후 수정사항

- 필수 수정 요청 없음. 실제 독립 리뷰 결과와 범위 제한을 이 Evidence에 기록했다.
- TASK-001 착수 시 결과 집계·Scope·빈 평가 결과의 구체적인 입력과 기대 판정·검증 상태를 정의하고 테스트한다. 상세 사례 작성·구현·실행 완료로 표시하지 않는다.
- 리뷰 결과 전달만으로 개발자 최종 확정을 간주하지 않았으며, 이후 별도 “ㅇㅋ 승인” 지시로 최종 확인을 기록했다. Commit / Merge / Push는 수행하지 않았다.

## 12. 최종 검증 결과

- [x] 확정 명세와 기존 코드·테스트·저장 설계 차이 기록
- [x] 유지 대상 및 후속 Domain 경계 제안
- [x] 문서 로컬 링크·공백 자체 검증
- [x] Codex B 독립 리뷰 — 개발자가 실제 최종 APPROVE 전달, 필수 수정 사항 없음
- [x] 개발자 최종 확인 — 2026-10-21 “ㅇㅋ 승인”
- 코드 테스트·Architecture Test·Evaluation 실행: N/A(문서 전용 조사).

## 13. Commit

- Commit Hash: 미수행.
- Commit Message: 미정. Commit / Merge / Push 수행하지 않음.
