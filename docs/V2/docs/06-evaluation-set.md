# Evaluation Set

## 1. 목적

일정 진단 결과가 코드 변경 이후에도 같은 원칙을 유지하는지 재현 가능한 조건으로 검증한다.

외부 API는 가능하면 Fixture / Stub / 고정 응답을 사용해 동일한 조건에서 재현 가능하게 검증한다.

## 2. 기본 Evaluation Cases

### EVAL-001 정상 일정

기대:

- 일정이 시간상 실행 가능
- 필요한 데이터 확인 가능
- 적절한 일정 판정과 `VERIFIED`

### EVAL-002 이동시간 부족

기대:

- 다음 일정 시작 전에 도착 불가능한 상황이 감지됨

### EVAL-003 체류시간 부족

기대:

- 필요한 체류시간을 확보하지 못한 상황이 감지됨

### EVAL-004 운영시간 충돌

기대:

- 방문 예정 시간과 운영시간 충돌이 감지됨

### EVAL-005 일정 충돌

기대:

- 앞 일정과 다음 일정의 시간 충돌이 감지됨

### EVAL-006 날씨 위험

기대:

- 일정 수행에 영향을 줄 수 있는 기상 위험이 결과에 반영됨

## 3. 외부 API 실패 Cases

### EVAL-101 TMAP 실패

확인:

- 이동시간을 확인하지 못한 사실이 숨겨지지 않는가
- SAFE/POSSIBLE로 임의 처리하지 않는가

### EVAL-102 TourAPI 실패

확인:

- 관광지 운영정보를 확인하지 못한 상태가 검증 상태에 반영되는가

### EVAL-103 기상청 실패

확인:

- 날씨 위험 없음으로 잘못 처리하지 않는가

### EVAL-104 지역 공공데이터 실패

확인:

- 해당 지역 특화 진단의 검증 불가 상태가 드러나는가

## 4. 불변조건 Evaluation

### EVAL-201 UNKNOWN -> SAFE

결과:

- FAIL

### EVAL-202 CRITICAL 발생 후 낮은 최종 판정

결과:

- FAIL

### EVAL-203 다른 지역에 부산 Rule 적용

결과:

- FAIL

### EVAL-204 필수 데이터 없이 판정 생성

결과:

- FAIL

### EVAL-205 PARTIAL / UNKNOWN 숨김

결과:

- FAIL

## 5. Region Scope Case

예:

```text
입력 지역: 서울
활성 Rule:
- 전국 공통 Rule O
- 부산 지역 특화 Rule X
```

```text
입력 지역: 부산
활성 Rule:
- 전국 공통 Rule O
- 부산 지역 특화 Rule O
```

## 6. Evaluation 기록 권장 형식

각 Case는 최소 다음 정보를 남긴다.

```text
Case ID
Given
When
Expected Rule Results
Expected Decision
Expected Verification Status
Invariant Check
```

## 7. 확정 계약 Evaluation

세부 입력·기대 결과는 [공통 명세](09-diagnosis-contract.md)의 9절을 따른다.
아래는 구현 시 자동화할 사례이며 현재 통과 결과가 아니다.

| Case ID | 조건 | 기대 |
|---|---|---|
| EVAL-301 | 최종 체류 100분, 활동 20분 | 서버 체류 100분, 추가 합산 없음 |
| EVAL-302 | 기타 활동 사용자 지정 75분 | 75분 유지, 고정 30분 대체 없음 |
| EVAL-303 | 이동 구간 각각 61초 | 총 122초, 구간별 분 올림 없음 |
| EVAL-304 | 검색 결과 장소 ID 진단 | 같은 ID 조회·검증 가능 |
| EVAL-305 | 고정 방문시간 이전/이후 도착 | 대기/조정 필요 구분 |
| EVAL-306 | 이동시간 확인 불가, 알려진 조정 필요 없음 | UNDETERMINED, decision null 금지 |
| EVAL-307 | 이동시간 확인 불가, 운영시간 충돌 확인 | ADJUSTMENT_REQUIRED + PARTIAL |
| EVAL-308 | 시간 계산 가능, 운영정보 확인 불가 | PARTIAL과 확인 불가 이유 노출 |
| EVAL-309 | 부산·타 지역 혼합 일정 | 부산 장소에만 부산 Rule 적용 |
| EVAL-310 | 결과와 지도 표시 | 같은 경로 시간·스냅샷 사용 |
| EVAL-311 | 운영시간 Rule에서 A 장소 충돌·B 장소 확인 불가 | 대상별 결과, ADJUSTMENT_REQUIRED + PARTIAL 유지 |
| EVAL-312 | 장소 지역 미확인, 다른 모든 항목 평가 성공·문제 없음 | REGION_APPLICABILITY = UNVERIFIABLE, POSSIBLE + PARTIAL, 특정 지역 Rule 미실행, coverage에 원인 표시 |
| EVAL-313 | 장소 지역 미확인, 모든 평가 항목 확인 불가 | REGION_APPLICABILITY 포함, UNDETERMINED + UNKNOWN, 특정 지역 Rule 미실행 |
| EVAL-314 | 장소 지역 미확인, 다른 항목에서 조정 필요 확인 | ADJUSTMENT_REQUIRED + PARTIAL 유지, 지역 미확인 결과 노출 |

## 8. 근거 기반 판정 보완 Evaluation

EVAL-315~322는 TASK-008 사전 검토와 개발자 결정을 반영한 명세 사례다. 엔진 구현 시 자동화할 대상이며, 현재 실행하거나 통과한 결과가 아니다.
Rule·target은 기존 공통 계약을 사용하며, 같은 장소의 독립 운영조건은 조건별 근거가 구분되는 평가 항목으로 남긴다.

### 공통 조건

- 유효한 요청을 서버에서 진단하는 경우를 전제로 한다. 대상별 RuleResult, 최종 decision·verificationStatus, 계산 불가 표시와 coverage를 확인한다.
- 별도 기재가 없으면 여행시간 09:00~12:00, 최종 체류 합계 60분, 이동 합계 10분, 고정 방문시간·대기 없음이다. 시간 계산은 가능하고 여유시간·이동 비율 주의 조건에도 해당하지 않는다.
- 각 사례에 명시한 확인 불가·위반 항목과 그 미확인 데이터에 의존하는 평가 외의 적용 대상 평가는 모두 EVALUATED + PASS로 주어진다. 이는 재현 가능한 검증 조건이며 실제 미지원 항목을 PASS로 취급하라는 뜻이 아니다.
- 검증 불가 이유는 해당 RuleResult와 coverage에 표시한다. 확인 불가를 PASS 또는 NOT_APPLICABLE로 대체하지 않고, 확인 가능한 다른 평가는 계속한다.

| Case ID | 조건(Given) | 기대 Rule 결과·계산 상태 | 기대 Decision / Verification |
|---|---|---|---|
| EVAL-315 | 사용 가능 3시간, 최종 체류 합계 4시간, 필수 이동시간 미확인 | 일정 종료시간 초과 IMPORTANT + EVALUATED + ADJUSTMENT_REQUIRED, 이동 UNVERIFIABLE. 정확한 requiredSeconds·remainingSeconds와 미확인 구간 이후 예상시각은 계산 불가 | ADJUSTMENT_REQUIRED + PARTIAL |
| EVAL-316 | 사용 가능 3시간, 최종 체류 합계 1시간, 필수 이동시간 미확인 | 체류 합계만으로 일정 가능 PASS를 만들지 않음. 이동 및 그 데이터에 의존하는 평가 UNVERIFIABLE, 정확한 총시간·잔여시간 계산 불가 | UNDETERMINED + PARTIAL |
| EVAL-317 | 기본 권장시간의 출처는 있지만 선택 활동이 이미 포함됐는지 불명확 | 권장 총시간 비교 UNVERIFIABLE, 임의 합산·차감 및 부족 경고 없음. 최종 plannedStaySeconds를 이용한 시간 계산은 유지 | POSSIBLE + PARTIAL |
| EVAL-318 | 방문 가능 여부에 필요한 휴게시간 정보를 해석하지 못하며 독립적으로 확인된 위반 없음 | 해당 운영조건 UNVERIFIABLE, 일부 운영정보만으로 전체 운영시간 PASS 또는 조정 필요를 생성하지 않음 | POSSIBLE + PARTIAL |
| EVAL-319 | 같은 장소에서 방문일 휴무가 확정됐고 별도 휴게시간 정보는 해석하지 못함 | 휴무 EVALUATED + ADJUSTMENT_REQUIRED와 휴게시간 UNVERIFIABLE을 같은 target의 조건별 근거로 구분해 유지 | ADJUSTMENT_REQUIRED + PARTIAL |
| EVAL-320 | 공식 통제 응답은 받았지만 여행 날짜·대상에 적용되는지 불명확 | 해당 통제 평가 UNVERIFIABLE, CRITICAL 조정 필요를 임의 생성하지 않음. 확인하지 못한 적용 범위 표시 | POSSIBLE + PARTIAL |
| EVAL-321 | 미래 여행일에 대해 기존 계약이 허용한 조회 시점 TMAP 예상시간을 사용하며 출처·조회시각·의미가 확인됨 | 미래 예측이 아니라는 이유만으로 이동 평가를 UNVERIFIABLE로 만들지 않음. 공통 조건의 이동 10분으로 계산하고 조회 시점 추정임을 표시 | POSSIBLE + VERIFIED |
| EVAL-322 | 필수 이동 구간 조회에서 통신 실패 또는 의미가 불명확한 빈 경로 응답을 받음(각각 검증) | 이동 UNVERIFIABLE, 0초·이동 가능·이동 불가로 대체하지 않음. 정확한 총시간·잔여시간 계산 불가 | UNDETERMINED + PARTIAL |

불변조건 확인: INV-001/004/005/008/009를 공통 확인하고, EVAL-320에서 적용 근거 없는 CRITICAL 확정을 방지한다. 지역 선택과 Scope는 기존 정책을 유지한다.
명확한 이동 불가 응답의 인정 조건·판정, 복잡한 운영시간 파서, 데이터별 유효기간·갱신주기 정의는 이 사례들의 구현 요구에 포함하지 않는다.
