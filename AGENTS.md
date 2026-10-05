# BusanFit V2 Agent Guide

## 1. 프로젝트 목적

BusanFit V2는 사용자가 구성한 국내 여행 일정이 실제로 실행 가능한지 진단하는 서비스다.

현재 구현 우선 지역은 부산이지만, 핵심 진단 엔진은 전국 공통 규칙을 기준으로 설계한다. 지역별로 필요한 공공데이터나 정책은 지역 특화 Rule로 분리한다.

프로젝트의 판단 기준은 다음 세 가지다.

1. 실제 서비스에서 필요한 기능인가
2. 백엔드 개발자 포트폴리오로 보여줄 가치가 있는가
3. AI를 단순 코드 생성이 아니라 개발·검증·운영 프로세스에 활용한 경험을 보여줄 수 있는가

## 2. 기본 서비스 흐름

```text
사용자
 ↓
Expo 앱
 ↓
일정 구성
 ↓
진단 요청
 ↓
Spring Boot Modular Monolith
 ↓
입력 검증
 ↓
Diagnosis Context
 ↓
Diagnosis Engine
 ↓
Rule Registry
 ↓
전국 공통 Rule + 지역 특화 Rule
 ↓
Rule Result 집계
 ↓
Diagnosis Result
 ↓
일정 판정 + 검증 상태
 ↓
사용자
```

## 3. 반드시 지켜야 하는 구조

- 핵심 비즈니스 판단은 Diagnosis Domain 내부에 둔다.
- 외부 API 호출은 Port/Adapter를 통해 분리한다.
- TMAP, TourAPI, 기상청, 지역 공공데이터 SDK/응답 형식이 Domain으로 직접 침투하지 않게 한다.
- 지역 특화 로직은 전국 공통 Rule과 분리한다.
- Rule 선택 책임은 Rule Registry에 둔다.
- 외부 API 원본 응답을 무분별하게 저장하지 않는다.
- 서비스에 필요한 최종 결과와 근거 중심으로 저장한다.

세부 구조는 `docs/V2/docs/01-architecture.md`를 따른다.

## 4. 핵심 불변조건

아래 규칙은 구현 편의를 위해 완화하거나 우회하면 안 된다.

### UNKNOWN != SAFE

정보를 확인하지 못했다는 이유로 정상 또는 안전으로 판단하지 않는다.

### CRITICAL Rule Override

CRITICAL Rule이 발생하면 다른 낮은 중요도의 결과와 관계없이 최종 판정에 반영한다.

### Scope Isolation

지역 특화 Rule은 해당 지역 외 일정에 적용하지 않는다.

### Invalid Input Protection

필수 데이터가 없으면 그 데이터를 필요로 하는 판정을 생성하지 않는다.

### Verification Visibility

PARTIAL / UNKNOWN 상태를 숨긴 채 POSSIBLE만 사용자에게 보여주지 않는다.

세부 내용은 `docs/V2/docs/03-invariants.md`를 따른다.

## 5. 진단 결과 모델

일정 판정과 검증 상태는 서로 다른 개념이다.

### 일정 판정

- `POSSIBLE`
- `CAUTION`
- `ADJUSTMENT_REQUIRED`
- `UNDETERMINED`

`decision`은 null이 아니다. 시간상 판정에 필요한 데이터를 확인하지 못하면 `UNDETERMINED`로 표현한다. 확인된 조정 필요 결과는 유지한다.

서버는 활동이 포함된 최종 `plannedStaySeconds`만 일정에 반영하며 활동시간을 추가 합산하지 않는다.

확정 계약은 `docs/V2/docs/09-diagnosis-contract.md`를 따른다.

### 검증 상태

- `VERIFIED`
- `PARTIAL`
- `UNKNOWN`

예를 들어 일정 계산상 실행 가능하더라도 필요한 외부 데이터 일부를 확인하지 못했다면 `POSSIBLE + PARTIAL`이 될 수 있다.

## 6. Rule 모델

모든 Diagnosis Rule은 최소한 다음 개념을 가져야 한다.

```text
DiagnosisRule
 ├─ Rule ID
 ├─ Scope
 │   ├─ NATIONAL
 │   └─ REGION
 │       └─ Region Code
 ├─ Importance
 │   ├─ NORMAL
 │   ├─ IMPORTANT
 │   └─ CRITICAL
 └─ evaluate(DiagnosisContext)
      ↓
    RuleResult
```

Rule 관련 상세 기준은 `docs/V2/docs/02-diagnosis-rules.md`를 따른다.

## 7. 구현 전 검증

코드를 바로 작성하지 않는다. 변경 전에 다음을 먼저 확인한다.

- 기존 Rule과 충돌하는가?
- Architecture 규칙을 위반하는가?
- Scope를 위반하는가?
- UNKNOWN을 SAFE처럼 처리하게 되는가?
- 개발자 판단이 필요한 정책 결정이 포함되어 있는가?

개발자 판단이 필요한 사항이 있다면 구현 전에 보고한다.

## 8. Agent 역할

### Codex A - Builder / Main Agent

가능:

- 코드 탐색
- 구현 전 검증
- 코드 구현
- 테스트 작성 및 실행
- Evaluation 실행
- 리뷰 반영
- Task Evidence 작성

권한:

- WRITE 가능

### Codex B - Reader / Reviewer

가능:

- 변경사항 읽기
- 요구사항 구현 여부 검토
- Rule 검토
- Architecture 검토
- 불변조건 검토
- 테스트 검토
- Evaluation 검토

권한:

- READ ONLY
- 코드 및 문서를 직접 수정하지 않는다.

리뷰에서는 발견한 문제를 중요도와 함께 보고한다.

문제가 있는 경우 다음 내용을 가능한 한 구체적으로 작성한다.

- 문제 위치
- 문제 내용
- 문제가 되는 이유
- 관련 Rule / Architecture / 불변조건
- 권장 수정 방향

리뷰 마지막에는 반드시 다음 둘 중 하나로 최종 결과를 명시한다.

- `APPROVE`
    - 필수 수정 사항이 없는 경우
    - 선택적인 개선 의견이 있더라도 현재 Task 완료를 막을 문제가 없는 경우

- `CHANGES_REQUIRED`
    - 요구사항, Rule, Architecture, 불변조건, 테스트 또는 Evaluation에서
      수정이 필요한 문제가 하나 이상 발견된 경우

최종 결과는 추정하지 않고 실제 리뷰 결과를 기준으로 판단한다.

### 개발자

- 최종 정책 결정
- Agent 판단 승인/거절
- 최종 변경 확인
- Commit / Merge 승인

## 9. 완료 조건

작업은 코드나 문서가 작성되었다고 끝난 것이 아니다.

최소 완료 조건:

1. 요구사항이 구현 또는 반영됨
2. 관련 Unit Test 통과
3. 필요한 Integration Test 통과
4. Architecture Test 통과
5. Static Analysis 통과
6. 관련 Evaluation Case 통과
7. 핵심 불변조건 위반 없음
8. Codex B 독립 리뷰 완료
9. 필요한 리뷰 수정 반영 및 재검증 완료
10. Task Evidence 작성 완료
11. 개발자 최종 확인 완료

작업 성격상 적용되지 않는 테스트나 검증 항목은 생략할 수 있으며,
Task Evidence에 `N/A`와 그 이유를 기록한다.

Codex A는 자신의 구현 또는 문서 수정과 자체 검증이 완료되면
Codex B 독립 리뷰를 수행한 것으로 간주하지 않고 작업을 멈춘다.

이 시점에서 개발자에게 현재 작업이
`Codex B 독립 리뷰 대기` 상태임을 보고한다.

Codex A는 개발자가 실제 Codex B 리뷰 결과를 전달하기 전까지
Codex B Review 완료, APPROVE, 재승인 등의 상태를 임의로 생성하거나 기록하지 않는다.

개발자는 별도의 Codex B 세션에서 Read-Only 독립 리뷰를 수행한다.

Codex B 리뷰 결과를 개발자가 확인한 뒤,
문제가 있다면 그 결과를 Codex A에 전달한다.

Codex A는 전달받은 리뷰 내용을 그대로 따르지 않고
실제 문제인지 확인한 뒤 필요한 수정만 반영하고 관련 검증을 다시 수행한다.

수정 범위가 크거나 Rule, Architecture, 불변조건에 영향을 주는 경우
개발자는 필요에 따라 Codex B 재리뷰를 수행한다.

Codex B 리뷰와 필요한 수정 및 재검증이 모두 완료된 뒤
Task Evidence를 최종 상태로 갱신한다.

Task Evidence를 개발자가 최종 확인하고 승인한 뒤
Commit / Merge를 진행한다.


## 10. Evidence

모든 의미 있는 변경은 `docs/V2/docs/evidence/` 아래에 기록한다.

형식은 `docs/V2/docs/evidence/TEMPLATE.md`를 따른다.

파일 예시:

```text
docs/V2/docs/evidence/
 ├─ TEMPLATE.md
 ├─ TASK-001.md
 ├─ TASK-002.md
 └─ ...
 ```

## 11. Worktree 정책

현재는 코드를 실제 수정하는 Agent가 Codex A 하나이므로 Git Worktree를 사용하지 않는다.

다음 상황이 생기면 Worktree 도입을 검토한다.

- 여러 Agent가 서로 다른 기능을 동시에 수정
- 구현 Agent와 테스트 구현 Agent를 분리
- 병렬 작업 간 파일 충돌 가능성이 생김

## 12. 문서 우선순위

구현 중 판단이 충돌하면 다음 순서로 확인한다.

1. `AGENTS.md`
2. `docs/V2/docs/03-invariants.md`
3. `docs/V2/docs/02-diagnosis-rules.md`
4. `docs/V2/docs/01-architecture.md`
5. `docs/V2/docs/06-evaluation-set.md`
6. `docs/V2/docs/09-diagnosis-contract.md`
7. 작업별 Task Evidence 및 관련 문서

정책 충돌이나 문서 간 모순이 발견되면 임의로 한쪽을 선택하지 말고 개발자에게 보고한다.
