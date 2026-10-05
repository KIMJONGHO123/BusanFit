# 모바일·서버 진단 공통 명세

상태: 확정. 2026-10-05 사용자 승인에 따라 V2 구현의 기준으로 사용한다.
이 문서는 목표 명세이며 현재 코드가 구현 완료됐다는 의미는 아니다.

## 1. 책임과 실행 흐름

- 모바일: 장소 검색 결과 선택, 일정·활동 입력, 입력 형식 검사, 서버 결과·지도 표시.
- 서버 응용 계층: 입력 검증, Port를 통한 외부 데이터 확인, DiagnosisContext 구성.
- Diagnosis Domain: RuleRegistry의 Rule 선택, DiagnosisEngine의 평가·집계·최종 판단.
- Adapter: 외부 응답·오류를 내부 모델로 변환. Rule은 외부 API를 직접 호출하지 않는다.
- 모바일의 별도 가능 여부 계산은 V2 연결 완료 후 최종 판단에 사용하지 않는다.

## 2. 요청 계약

V2 계약은 `/api/v2/planner/diagnose`에 적용한다. 기존 API는 전환 기간 동안 별도로 유지할 수 있다.

| 필드 | 형식·의미 |
|---|---|
| travelDate | 실제 존재하는 날짜, YYYY-MM-DD |
| startTime / endTime | HH:mm. 같은 날이며 endTime > startTime |
| timeZone | 초기 지원값 Asia/Seoul |
| transportMode | 초기 지원값 CAR |
| departure | name, latitude, longitude 필수 |
| stops | 1개 이상. 배열 순서가 방문 순서이며 별도 order 입력 없음 |
| stops[].placeId | 서버 검색 API가 반환한 공통 장소 ID |
| stops[].plannedVisitTime | 선택 입력, HH:mm. 없으면 자동 배치, 있으면 고정 방문시간 |
| stops[].plannedStaySeconds | 활동을 포함한 최종 계획 체류시간. 양의 정수 |
| stops[].activities | 활동 코드 목록. 기타 활동은 durationSeconds 양의 정수 필수 |

일반 활동 시간은 서버의 활동 정책을 기준으로 한다. 앱은 같은 정책을 조회해서 사용한다.
서버는 기타 활동의 사용자 지정 시간을 그대로 검증·사용하며 고정 30분으로 대체하지 않는다.
활동 코드는 현재 지원 코드를 유지하고, 같은 장소의 중복 활동 코드는 거부한다.
초기에는 같은 장소 ID를 한 일정에 중복 등록하지 않는다.

### 장소 식별

- 검색과 진단은 같은 placeId를 사용한다. 외부 출처·원본 ID는 서버가 매핑한다.
- 서버가 선택 장소의 존재·좌표·지역을 확인한다. 앱에서 보낸 장소 설명을 판단 근거로 신뢰하지 않는다.
- 고정 관광지 3곳 Catalog를 실제 검색 장소 조회 구조로 교체한다.
- 장소 검색 실패와 검색 결과 없음은 구분해서 표시한다. 서비스 흐름에서 mock 장소로 자동 대체하지 않는다.
- 출발지는 이름과 유효한 좌표를 받는다. 초기에는 부산 기본 출발지와 검색 결과 선택을 지원한다.

## 3. 체류시간과 활동시간: 중복 합산 금지

체류시간은 다음 세 개념을 분리한다.

- recommendedBaseStaySeconds: 장소의 기본 권장 체류시간과 그 출처.
- activitySeconds: 활동 정책·기타 활동 사용자 입력으로 확인한 활동시간 합계.
- plannedStaySeconds: 사용자가 확정한 최종 체류시간. 활동을 이미 포함한다.

모바일 초기 제안값 = recommendedBaseStaySeconds + activitySeconds.
사용자는 이 제안값을 수정한 뒤 최종 plannedStaySeconds를 확정한다.
활동 변경 후에는 갱신된 활동 정보와 최종 체류시간을 함께 확인할 수 있어야 한다.

**서버 일정 계산에는 plannedStaySeconds만 사용한다. 활동시간이나 기본 권장시간을 다시 더하지 않는다.**

```text
기본 권장 90분 + 활동 20분 → 초기 제안 110분
사용자가 최종 100분으로 수정 → 요청 plannedStaySeconds = 6000
서버 체류시간 = 6000초 (100분)
서버가 6000 + 1200 또는 5400 + 6000 + 1200으로 계산하는 것은 금지
```

체류시간 Rule은 최종 계획시간과 권장 총시간(기본 권장 + 활동)을 비교한다.
권장값은 추정치로 취급한다. 부족은 CAUTION이며 그 자체로 방문 불가를 선언하지 않는다.
권장시간의 근거가 없으면 해당 비교는 UNVERIFIABLE이다. 임의 값을 검증된 사실로 취급하지 않는다.

## 4. 시간 계산

- 소요시간은 초 단위 정수 또는 Duration으로 계산한다. 구간별 분 올림 금지.
- 사용자 분 입력은 초로 변환하고 화면 표시 시에만 반올림한다.
- 내부·응답 도착/출발시각은 날짜와 UTC offset을 포함한다.
- 첫 이동 구간은 출발지 → 첫 장소이며 이후 요청 순서대로 이동한다.
- 자동 배치 장소: 도착 후 바로 체류를 시작한다.
- 고정 방문시간 장소: 일찍 도착하면 대기, 늦게 도착하면 이동시간 부족을 기록한다.
- 실제 체류 시작 = max(예상 도착, 고정 방문시간), 예상 출발 = 실제 체류 시작 + plannedStaySeconds.
- 고정 방문시간은 여행 시작·종료 범위 안이어야 한다. 앞 장소의 방문 구간과 겹치면 충돌 Rule로 보고한다.
- 마지막 예상 출발이 여행 종료시각을 넘으면 ADJUSTMENT_REQUIRED.
- 자정을 넘는 예상시각도 날짜를 보존해 초과로 표시한다. 초기 입력은 하루 일정이며 다일 입력은 미지원이다.
- requiredSeconds = 이동 + 대기 + 최종 계획 체류 합계. remainingSeconds = availableSeconds - requiredSeconds.
- 이동시간이 없는 구간 이후의 예상시각·총 필요시간·잔여시간은 계산 불가로 표시하고 0으로 대체하지 않는다.

## 5. 결과 계약

| 필드 | 의미 |
|---|---|
| diagnosisId | 진단 식별자 |
| decision | POSSIBLE / CAUTION / ADJUSTMENT_REQUIRED / UNDETERMINED. null 금지 |
| verificationStatus | VERIFIED / PARTIAL / UNKNOWN |
| summary | 판정과 확인 한계를 함께 설명 |
| schedule | 계획시간·예상 도착/출발·대기·이동·최종 체류시간, 계산 불가 여부 |
| ruleResults | Rule ID, scope, importance, target, evaluationStatus, outcome, 근거·원인·조정 방법 |
| coverage | 지원·미지원 항목과 지역, 미지원 이유 |
| diagnosedAt | 진단 시각 |
| dataReferences | 외부 데이터 기준시각·출처·확인 상태. 원본 응답 제외 |

V2 응답에서는 feasible을 별도 최종 판정으로 제공하지 않는다.
이동 경로의 시간·거리·좌표를 내부 모델로 반환하거나 diagnosisId에 연결된 조회로 제공한다.
지도와 결과는 같은 진단의 경로 스냅샷을 사용한다. 재진단 시 둘을 함께 갱신한다.
TMAP 조회시각의 예상시간임을 명시하며 미래 출발시각 예측으로 표시하지 않는다.

## 6. Rule 평가와 집계

평가 단위는 Rule 종류 전체가 아니라 적용 대상별 평가 항목이다.
target은 일정 전체(SCHEDULE), 장소(STOP: stops 배열의 0 기반 stopIndex와 placeId),
이동 구간(SEGMENT: 응답 경로의 segmentId와 출발·도착 대상)을 식별한다.
같은 운영시간 Rule에서 A 장소의 충돌을 확인하고 B 장소의 정보를 확인하지 못했다면
두 RuleResult를 각각 EVALUATED + ADJUSTMENT_REQUIRED와 UNVERIFIABLE로 기록한다.
최종 판정과 검증 상태는 이 평가 항목 단위로 집계하여 ADJUSTMENT_REQUIRED + PARTIAL을 유지한다.

evaluationStatus:

- EVALUATED: 필요한 데이터가 있어 평가함. outcome은 PASS / CAUTION / ADJUSTMENT_REQUIRED.
- UNVERIFIABLE: 데이터 부족·외부 장애·미지원으로 확인 불가. outcome 없음.
- NOT_APPLICABLE: 적용 대상이 아님. outcome 없음. 지역이 다른 Rule은 실행하지 않는다.

검증 범위에는 전국 공통 진단 항목과 해당 지역에서 확인해야 할 지역 진단 항목을 포함한다.
미구현·미지원 항목도 coverage와 UNVERIFIABLE로 드러낸다. 미지원은 NOT_APPLICABLE로 숨기지 않는다.

지역을 확인할 수 없는 장소도 검증 범위에서 제외하지 않는다.
장소별 공통 확인 항목 REGION_APPLICABILITY(지역 진단 적용 가능성 확인)를 두고,
지역 미확인 시 target = 해당 STOP, scope = NATIONAL, importance = IMPORTANT,
evaluationStatus = UNVERIFIABLE, outcome 없음으로 ruleResults에 기록한다.
이 항목은 특정 지역의 위험 Rule이 아니라 지역 Rule을 선택할 수 있는지 확인하는 전국 공통 항목이다.
지역 확인 성공은 해당 항목의 EVALUATED + PASS이며 지역 통제의 안전 확인을 뜻하지 않는다.
선택된 지역 Rule 또는 지역 특화 미지원 항목은 별도로 평가·기록한다.
지역 미확인 사실과 원인은 coverage에도 표시하되, coverage 표시만으로 평가 결과를 대체하지 않는다.
확인 불가 항목을 집계에서 빼거나 NOT_APPLICABLE로 바꾸어 VERIFIED를 만드는 것은 금지한다.

- VERIFIED: 적용 대상 항목이 모두 평가됨.
- PARTIAL: 평가된 항목과 확인 불가 항목이 함께 존재함.
- UNKNOWN: 적용 대상 항목을 하나도 평가하지 못함.

지역 미확인 항목이 하나라도 있으면 VERIFIED가 될 수 없다.
다른 항목이 평가됐다면 PARTIAL, 평가된 항목이 없다면 UNKNOWN이다.
시간상 계산이 완료되고 확인된 문제가 없다면 POSSIBLE + PARTIAL이 가능하지만 지역 통제 미확인을 함께 노출한다.
지역 미확인 자체만으로 UNDETERMINED나 ADJUSTMENT_REQUIRED를 강제하지 않는다. decision은 아래 시간·Rule 집계 정책을 따른다.

최종 decision 집계 순서:

1. 확인된 조정 필요 결과가 하나라도 있으면 ADJUSTMENT_REQUIRED. CRITICAL 결과는 반드시 반영한다.
2. 조정 필요가 확인되지 않았지만 이동·계획 시간 데이터 부족으로 시간상 실행 가능성을 확정할 수 없으면 UNDETERMINED.
3. 시간상 실행 가능성을 확인했고 평가된 Rule에 주의가 있으면 CAUTION.
4. 시간상 실행 가능성을 확인했고 평가된 Rule에 문제가 없으면 POSSIBLE.

운영시간·날씨 등 일부 확인 실패가 있어도 시간상 계산이 완료됐다면 POSSIBLE + PARTIAL이 가능하다.
이 경우 미확인 항목을 안전하다고 표현하지 않는다.
TMAP 일부 실패 + 확인된 운영시간 충돌은 ADJUSTMENT_REQUIRED + PARTIAL이다.
TMAP 일부 실패 + 확인된 조정 필요 없음은 UNDETERMINED이며 검증 상태는 실제 항목 확인 비율에 따라 정한다.
UNDETERMINED와 UNKNOWN은 같은 개념이 아니며 반드시 함께 발생하는 것도 아니다.
Rule을 실행하지 않았거나 모든 항목을 확인하지 못한 경우 POSSIBLE / VERIFIED를 기본값으로 만들지 않는다.

### 초기 Rule 정책

| 조건 | importance | outcome |
|---|---|---|
| 공식 데이터로 확인된 통제·방문 금지 | CRITICAL | ADJUSTMENT_REQUIRED |
| 고정 방문시간 도착 불가·일정 충돌·종료시간 초과 | IMPORTANT | ADJUSTMENT_REQUIRED |
| 확인된 운영시간과 방문 구간 충돌 | IMPORTANT | ADJUSTMENT_REQUIRED |
| 권장 총체류시간 부족 | NORMAL | CAUTION |
| 여유시간 30분 미만(0 이상) | NORMAL | CAUTION |
| 총 이동시간 / 사용 가능 시간 >= 40% | NORMAL | CAUTION |

30분·40%는 내부 설정으로 관리한다. 필요한 계산 데이터가 없으면 해당 조건을 평가하지 않는다.
날씨 위험 임계값은 데이터와 함께 별도 정책 작업에서 정의한다. 정의·구현 전에는 미지원으로 표시한다.

## 7. 입력 오류·외부 실패·지역

- 누락·잘못된 날짜/시간·좌표 범위·잘못된 ID·비양수 체류시간·미지원 코드 등 요청 오류는 400.
- 문법상 유효한 ID의 조회가 외부 장애로 실패한 것은 입력 오류로 단정하지 않는다. 확인 불가로 반영한다.
- 외부 장애는 가능한 다른 평가를 계속하고 PARTIAL / UNKNOWN과 Rule 근거에 반영한다.
- 지역은 서버가 장소별로 확인한다. 혼합 지역 일정에서도 부산 Rule은 부산 장소에만 적용한다.
- 타 지역의 지역 특화 미지원은 coverage와 UNVERIFIABLE 평가 항목으로 표시한다.
- 지역 자체를 확인할 수 없으면 부산 등 특정 지역 Rule을 추측 적용하지 않는다. 대신 6절의 REGION_APPLICABILITY를 UNVERIFIABLE로 기록하고 검증 상태에 반영한다.
- 외부 원본 응답은 서비스 응답·DB에 포함하지 않는다. 최종 결과·필요 근거 중심으로 저장한다.
- 정확한 좌표·전체 일정은 운영 로그에 불필요하게 기록하지 않으며 관측 데이터는 마스킹한다.

## 8. 구현과 전환 순서

1. 이 계약을 기준으로 Domain 기본 타입·RuleRegistry·Engine 구현(TASK-001).
2. 고정 Context로 시간·체류·충돌·집계 및 불변조건 검증.
3. Port 정의 후 기존 TMAP / TourAPI를 Adapter로 연결.
4. V2 API와 앱 입력·결과·지도 연결. 기존 계산과 mock 자동 대체 제거.
5. 운영시간·날씨·지역 Rule, 저장, 관측을 로드맵에 따라 확장.

매 작업부터 Unit / Integration / Architecture / Static Analysis / Evaluation 및 독립 리뷰·Evidence를 적용한다.
미구현 Rule 때문에 모든 항목을 검증한 것처럼 표시하지 않는다.

## 9. 필수 계약 검증 사례

- 최종 체류 100분 + 활동 20분 요청의 서버 체류는 100분이다.
- 기타 활동 75분이 고정 30분으로 변하지 않는다.
- 두 이동 구간이 각각 61초이면 총 이동은 122초이다.
- 검색 결과 placeId를 진단에서 그대로 사용할 수 있다.
- 고정 방문시간 이전 도착은 대기, 이후 도착은 조정 필요이다.
- TMAP 실패만으로 POSSIBLE을 생성하지 않는다. decision은 UNDETERMINED이며 null이 아니다.
- TMAP 실패와 확인된 조정 필요가 함께 있으면 조정 필요를 유지한다.
- 시간 계산 성공·운영정보 실패는 PARTIAL과 미확인 운영정보를 표시한다.
- 혼합 지역 일정에 부산 Rule을 부산 외 장소에 적용하지 않는다.
- 장소 지역 미확인·다른 항목 평가 성공 시 REGION_APPLICABILITY의 UNVERIFIABLE과 PARTIAL을 유지하며 특정 지역 Rule을 실행하지 않는다.
- 모든 항목 확인 불가·장소 지역 미확인 시 UNKNOWN이며 지역 확인 실패를 집계에서 제외하지 않는다.
- 같은 운영시간 Rule에서 한 장소는 충돌, 다른 장소는 확인 불가이면 대상별 결과와 ADJUSTMENT_REQUIRED + PARTIAL을 유지한다.
- 지도·결과의 경로 시간과 스냅샷이 같다.
