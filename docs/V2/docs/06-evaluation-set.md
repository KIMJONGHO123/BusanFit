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
