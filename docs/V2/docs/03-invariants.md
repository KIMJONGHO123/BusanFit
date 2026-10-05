# BusanFit V2 Invariants

이 문서는 구현 편의보다 우선한다.

## INV-001. UNKNOWN != SAFE

### 규칙

정보를 확인하지 못했다는 사실을 정상 또는 안전하다는 뜻으로 해석하지 않는다.

### 금지 예시

```text
Weather API 실패
→ 날씨 정보 없음
→ 위험 없음 처리
```

### 허용 방향

```text
Weather API 실패
→ 필요한 기상 정보 확인 불가
→ 검증 상태 PARTIAL 또는 UNKNOWN
```

## INV-002. CRITICAL Rule Override

### 규칙

CRITICAL Rule이 발생하면 다른 Rule 결과와 관계없이 최종 판정에 반영한다.

낮은 중요도의 긍정 결과들이 CRITICAL 결과를 상쇄하면 안 된다.

## INV-003. Scope Isolation

### 규칙

지역 특화 Rule은 해당 지역 외 일정에 적용하지 않는다.

### 금지 예시

```text
서울 일정
→ 부산 공공데이터 Rule 실행
```

## INV-004. Invalid Input Protection

### 규칙

필수 데이터가 없으면 그 데이터를 필요로 하는 판정을 생성하지 않는다.

### 예시

이동시간 계산에 필요한 좌표가 없다면 도착 가능 여부를 정상적으로 판정한 것처럼 결과를 만들지 않는다.

## INV-005. Verification Visibility

### 규칙

PARTIAL / UNKNOWN 상태를 숨긴 채 POSSIBLE만 사용자에게 보여주지 않는다.

사용자는 일정 판정과 함께 검증 상태도 확인할 수 있어야 한다.

## INV-006. External Raw Data Storage Minimization

### 규칙

외부 API의 원본 응답을 무분별하게 DB에 저장하지 않는다.

서비스에 필요한 최종 결과와 판단 근거 중심으로 저장한다.

## INV-007. Agent Cannot Replace Developer Decision

### 규칙

정책 충돌, 구조 변경, Rule 의미 변경처럼 개발자 판단이 필요한 사항을 Agent가 임의로 확정하지 않는다.

## INV-008. Stay Duration No Double Counting

서버 일정 계산은 활동이 포함된 최종 plannedStaySeconds만 반영한다. 활동시간이나 기본 권장시간을 다시 더하지 않는다.

## INV-009. Explicit Undetermined Decision

decision은 null이 아니다. 시간상 실행 가능성의 필수 데이터가 부족하고 확인된 조정 필요가 없으면 UNDETERMINED이다.
확인된 조정 필요는 유지하며 UNDETERMINED로 덮지 않는다. verificationStatus는 별도로 집계한다.

## 검증 방법

이 불변조건들은 다음 수단으로 반복 검증한다.

- Unit Test
- Integration Test
- Architecture Test
- Evaluation Set
- Codex B 독립 리뷰
- Task Evidence
