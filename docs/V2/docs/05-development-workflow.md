# AI Agent Development Workflow

## 1. 기본 원칙

AI에게 바로 "코드를 작성해라"라고 요청하지 않는다.

작업 전에 다음 문맥을 제공한다.

```text
Goal
+ Context
+ Rule
+ Architecture
+ Constraint
+ 완료 기준
```

## 2. 전체 Workflow

```text
Goal
 ↓
명세 / 문맥 / Rule / Architecture 확인
 ↓
Codex A
 ↓
코드 탐색
 ↓
구현 전 검증
 ↓
개발자 판단 필요 여부 확인
 ↓
구현
 ↓
자동 검증
 ├─ Unit Test
 ├─ Integration Test
 ├─ Architecture Test
 ├─ Static Analysis
 └─ Evaluation Set
 ↓
Codex A 1차 작업 완료
 ↓
Codex B 독립 리뷰
 ↓
개발자 판단
 ↓
필요 시 Codex A 수정 및 재검증
 ↓
Task Evidence 작성
 ↓
개발자 최종 확인
 ↓
Commit / Merge
 ↓
배포
```

## 3. 구현 전 검증

Codex A는 코드 작성 전에 최소 다음을 확인한다.

- 기존 Rule과 충돌하는가?
- Architecture 규칙을 위반하는가?
- Scope를 위반하는가?
- UNKNOWN을 SAFE로 처리하는가?
- 개발자 판단이 필요한 사항이 있는가?

## 4. 개발자 판단이 필요한 경우

```text
Codex A 문제 발견
 ↓
개발자에게 보고
 ↓
개발자 결정
 ↓
Codex A 작업 계속
```

Agent가 정책을 임의로 확정해서는 안 된다.

## 5. Codex B 리뷰 체크리스트

- 요구사항이 실제 구현되었는가
- Rule 의미가 바뀌지 않았는가
- Scope가 올바른가
- Architecture 경계를 위반하지 않았는가
- 핵심 불변조건을 위반하지 않았는가
- 테스트 누락이 없는가
- Evaluation이 충분한가

## 6. 리뷰 이후

문제가 있으면:

```text
Codex B Review
 ↓
개발자 판단
 ↓
Codex A에 리뷰 전달
 ↓
Codex A가 실제 문제인지 확인
 ↓
필요한 경우 수정
 ↓
자동 검증 재실행
 ↓
필요 시 Codex B 재리뷰
```

## 7. Commit 전 체크

- [ ] 요구사항 구현 완료
- [ ] Unit Test 통과
- [ ] Integration Test 통과
- [ ] Architecture Test 통과
- [ ] Static Analysis 통과
- [ ] Evaluation 통과
- [ ] Codex B 리뷰 완료
- [ ] Review 이후 수정 검증 완료
- [ ] Task Evidence 작성 완료
- [ ] 개발자 최종 확인 완료
