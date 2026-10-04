# TASK-001 Evidence

## 1. Task ID

`TASK-001`

## 2. Goal

BusanFit V2의 Diagnosis Domain 기본 타입과 Rule 실행 골격을 구현한다.

이번 Task에서는 외부 API 실제 연동보다 Domain 경계와 핵심 불변조건을 코드 구조로 표현하는 데 집중한다.

## 3. 관련 요구사항

- 일정 판정과 검증 상태를 분리한다.
- `DiagnosisRule` 실행 구조를 만든다.
- NATIONAL / REGION Scope를 구분할 수 있게 한다.
- `RuleRegistry`가 실행 가능한 Rule을 선택할 수 있게 한다.
- `DiagnosisEngine`이 Rule 결과를 수집할 수 있게 한다.

## 4. 관련 문서 / Rule

- `AGENTS.md`
- `docs/01-architecture.md`
- `docs/02-diagnosis-rules.md`
- `docs/03-invariants.md`
- `docs/06-evaluation-set.md`

## 5. 예상 변경 범위

현재 저장소의 실제 패키지 구조를 확인한 뒤 확정한다.

후보 개념:

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

## 6. 구현 전 체크

- [ ] 기존 진단 관련 코드 위치 확인
- [ ] 기존 클래스와 중복되는 개념 확인
- [ ] 현재 패키지 규칙 확인
- [ ] 기존 API 응답 모델과 Domain 모델이 섞여 있는지 확인
- [ ] 새로운 구조가 기존 기능을 불필요하게 깨뜨리지 않는지 확인

## 7. 완료 조건

- [ ] Domain 기본 타입 구현
- [ ] Rule 실행 골격 구현
- [ ] NATIONAL / REGION Scope 구분 가능
- [ ] 일정 판정 / 검증 상태 분리
- [ ] 최소 Unit Test 작성
- [ ] UNKNOWN != SAFE를 깨는 기본 동작 없음
- [ ] Codex B Review 완료
- [ ] 이 Evidence 문서의 나머지 항목 작성

---

아래부터는 실제 구현 후 채운다.

## 8. 변경 파일

- 

## 9. Codex A 주요 판단

### 구현 방식

- 

### 기존 구조와의 관계

- 

### 구현 중 발견한 문제

- 

## 10. 개발자 결정

- 

## 11. 자동 검증 결과

### Unit Test

- 

### Integration Test

- 

### Architecture Test

- 

### Static Analysis

- 

## 12. Evaluation 결과

- 

## 13. Codex B Review

- 

## 14. Review 이후 수정사항

- 

## 15. 최종 검증 결과

- 

## 16. Commit

- Commit Hash:
- Commit Message:
