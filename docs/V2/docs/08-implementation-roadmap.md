# Implementation Roadmap

이 문서는 기존 구조를 실제 코드로 옮기기 위한 시작 순서를 제안한다.

세부 클래스명과 패키지명은 현재 저장소 구조를 확인한 뒤 확정한다.

## Phase 0. 현재 코드 기준선 확보

목표:

- V1에서 유지할 코드와 V2에서 교체할 코드를 구분한다.

작업:

- 현재 서버 패키지 구조 확인
- 기존 진단 관련 코드 목록 작성
- 기존 TMAP / TourAPI / 기상청 연동 위치 확인
- 기존 저장 모델 확인
- 기존 테스트 확인
- V2 문서와 충돌하는 구현 표시

완료 조건:

- 기존 코드에서 V2 진단 핵심 경계를 어디에 만들지 설명할 수 있음

확정 입력·결과·판정 계약은 [09-diagnosis-contract.md](09-diagnosis-contract.md)를 따른다.
Domain 골격부터 UNDETERMINED와 최종 체류시간 중복 합산 금지를 반영한다.

## Phase 1. Diagnosis Domain 골격

목표:

외부 API 없이도 Domain 핵심 구조가 컴파일되고 테스트 가능하게 만든다.

우선 구현 대상:

```text
DiagnosisContext
DiagnosisRule
RuleResult
RuleScope
RuleImportance
DiagnosisDecision
VerificationStatus
DiagnosisResult
RuleRegistry
DiagnosisEngine
```

완료 조건:

- 빈/고정 Context로 Rule을 실행할 수 있음
- 일정 판정과 검증 상태가 별도 타입으로 존재함
- NATIONAL / REGION Scope를 구분할 수 있음

## Phase 2. 외부 의존성이 적은 전국 공통 Rule

추천 순서:

1. 일정 충돌 Rule
2. 체류시간 Rule
3. 입력 유효성 관련 처리

이 단계에서는 외부 API 없이도 핵심 Rule 구조를 검증한다.

완료 조건:

- Rule Registry가 전국 공통 Rule을 선택함
- Evaluation Set의 기본 케이스 일부가 동작함

## Phase 3. Port 정의

구현 대상:

```text
TravelTimePort
TourismPort
WeatherPort
RegionalDataPort
Repository Port
```

완료 조건:

- Domain 코드가 외부 SDK/HTTP Client/JPA 구현에 직접 의존하지 않음

## Phase 4. 외부 Adapter 연결

순서 예시:

1. TMAP Adapter
2. TourAPI Adapter
3. 기상청 Adapter
4. MySQL Adapter

완료 조건:

- 외부 응답이 내부 모델로 변환됨
- 외부 실패를 검증 상태에 반영할 수 있음

## Phase 5. 외부 데이터 기반 전국 공통 Rule

구현 대상:

- 이동시간 Rule
- 운영시간 Rule
- 날씨 위험 Rule

완료 조건:

- 외부 API 성공/실패 Fixture를 이용한 Integration Test 가능
- UNKNOWN != SAFE Evaluation 통과

## Phase 6. 부산 지역 특화 Rule

목표:

전국 공통 엔진에 부산 Rule을 플러그인처럼 추가한다.

작업:

- `RegionalDataPort` 기반 부산 Adapter 구현
- 부산 Region Code 정의
- 부산 전용 Rule 구현
- Rule Registry 연결
- Region Scope Evaluation 작성

완료 조건:

```text
부산 일정
→ National + Busan Rule

타 지역 일정
→ National Rule only
```

## Phase 7. 진단 결과 API와 Expo 연결

결과 응답에 최소 포함:

- 일정 판정
- 검증 상태
- Rule별 결과
- 판단 근거
- 문제 원인
- 조정 방법

완료 조건:

- Expo 앱에서 POSSIBLE만 단독 표시하지 않음
- PARTIAL / UNKNOWN이 사용자에게 노출됨

## Phase 8. Evaluation 자동화

목표:

구현 변화로 핵심 판단 원칙이 깨지는 것을 방지한다.

작업:

- 정상 일정
- 이동시간 부족
- 체류시간 부족
- 운영시간 충돌
- 일정 충돌
- 날씨 위험
- 각 외부 API 실패
- UNKNOWN Case
- CRITICAL Case
- Region Scope Case

완료 조건:

- 재현 가능한 Fixture / Stub 기반 실행 가능

## Phase 9. Agent Workflow 실제 적용

첫 Task부터 다음 순서를 사용한다.

```text
Goal 작성
 ↓
Codex A 구현 전 검증
 ↓
구현 + 자동 검증
 ↓
Codex B Read-Only Review
 ↓
개발자 판단
 ↓
Task Evidence
 ↓
Commit
```

권장 첫 Evidence:

```text
docs/evidence/TASK-001.md
```

주제 예시:

`Diagnosis Domain 기본 타입과 Rule 실행 골격 구현`

## Phase 10. Observability / AIOps

핵심 진단 기능이 먼저 안정화된 이후 적용한다.

작업:

- OpenTelemetry 연결
- Collector 구성
- 시스템 관측 지표 정의
- 진단 품질 지표 정의
- AIOps Agent가 조회 가능한 마스킹 데이터 범위 정의

완료 조건:

- UNKNOWN/PARTIAL/외부 API 실패율을 운영에서 확인 가능
- Agent는 분석과 제안만 수행하고 직접 운영 변경하지 않음
