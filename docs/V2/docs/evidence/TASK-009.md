# TASK-009 Evidence

상태: **완료 — Codex B 독립 리뷰 APPROVE 및 개발자 최종 확인 완료, Commit 승인됨**.
작업일: 2026-10-25. Rule·공통 계약·Evaluation 문서 보완이며 진단 엔진 코드 구현 완료가 아니다.

## 1. Task ID

`TASK-009`

## 2. Goal

TASK-008에서 검토하고 개발자가 승인한 5개 보완 방향을 정식 Rule·공통 계약·Evaluation 문서에 반영한다. 지원 범위를 확장하는 대신 확인된 근거와 검증 불가의 경계를 명확히 한다.

## 3. 관련 요구사항

- 개발자가 TASK-008 확인 후 기본 Rule에 합의된 보완 사항을 반영하도록 지시함.
- 체류시간 합계만으로 초과가 증명되면 이동시간 미확인 중에도 조정 필요를 유지함.
- 권장시간의 활동 포함 범위가 불명확하면 임의 합산하지 않고 해당 비교를 검증 불가로 처리함.
- 해석하지 못하는 운영조건은 검증 불가로 남기되 독립적으로 확인된 휴무·위반은 유지함.
- 외부 근거의 적용 가능성은 데이터별 계약으로 확인하며, 기존 TMAP 조회 시점 예상시간 사용 정책은 유지함.
- 통신 실패·의미 불명확한 빈 경로 응답을 이동 가능·이동 불가로 확정하지 않음.
- 복잡한 운영시간 처리, 자동 대기·재배치, 데이터별 유효기간·갱신주기, 새 이동 불가 판정 정책은 이번 범위에 추가하지 않음.
- 진단 코드·웹·모바일은 변경하지 않음. TASK-008의 승인 이력과 작업 시작 전부터 있던 사용자 수정은 보존함.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md)
- [Architecture](../01-architecture.md)
- [Rules](../02-diagnosis-rules.md)
- [Invariants](../03-invariants.md)
- [Evaluation](../06-evaluation-set.md)
- [공통 계약](../09-diagnosis-contract.md)
- [사전 검토·개발자 결정·실제 Codex B 리뷰](TASK-008.md)

## 5. 변경 파일

- `docs/V2/docs/02-diagnosis-rules.md`: 이동·체류·운영·일정 충돌 Rule 조건과 근거 적용 가능성·지원 범위 보완.
- `docs/V2/docs/09-diagnosis-contract.md`: 권장시간 합산 조건, 독립적으로 증명 가능한 초과, 운영조건별 결과 보존, 외부 근거·경로 실패 처리와 계약 검증 사례 반영.
- `docs/V2/docs/06-evaluation-set.md`: EVAL-315~322의 공통 조건과 기대 Rule 결과·최종 판정·검증 상태 정의.
- `docs/V2/docs/evidence/TASK-008.md`: 개발자의 실제 확인에 따라 최종 확인 상태만 마감하고 후속 TASK-009를 구분함. 기존 승인된 사전 검토·리뷰 내용은 유지함.
- `docs/V2/docs/evidence/TASK-009.md`: 이번 명세 변경의 근거·범위·검증·리뷰 대기 기록.

## 6. Codex A 주요 판단

### 구현 방식

- 5개 보완 사항을 모두 별도 신규 Rule로 만들지 않고, 기존 Rule의 판정·평가 가능 조건과 공통 근거 처리 원칙으로 반영함.
- 체류시간 합계 초과는 기존 일정 종료시간 초과의 IMPORTANT + ADJUSTMENT_REQUIRED 조건으로 명시함. 미확인 이동시간을 0으로 채우지 않고 정확한 총시간·잔여시간의 계산 불가를 유지함.
- 권장시간 비교의 검증 불가와 최종 계획시간 계산을 분리함. 최종 plannedStaySeconds나 활동 입력을 임의로 변경하지 않음.
- 같은 장소의 휴무 확인과 휴게시간 해석 실패는 독립 조건별 근거가 구분되는 평가 항목으로 남기도록 명시함. ADJUSTMENT_REQUIRED + PARTIAL을 유지하고 불명확한 조건을 숨기지 않음.
- TMAP 조회 시점 예상시간은 기존 계약대로 사용할 수 있음. 통제·운영정보의 여행 날짜 검증을 일률적으로 TMAP 미래 예측 요구로 확대하지 않음.
- 명확한 이동 불가 응답의 정책은 실제 Adapter 계약을 확인하는 후속 작업에 남김. 이번에는 의미 불명확한 응답을 임의 판정에 쓰지 않는 조건만 정함.

### 기존 구조와의 관계 / 변경 전 검증

- AGENTS, 불변조건, 기존 Rule, Architecture, Evaluation, 공통 계약, TASK-008 개발자 결정 순서로 관련 기준을 확인함.
- INV-001/004/005: 지원하지 못하는 항목을 UNVERIFIABLE과 이유로 노출하고 PASS·NOT_APPLICABLE로 숨기지 않음.
- INV-002/009: 적용 근거가 확인된 CRITICAL·조정 필요를 유지하고, 조정 필요가 없으며 시간상 필수 데이터가 부족하면 UNDETERMINED임.
- INV-003: 전국 공통 계산과 근거 사용 조건만 보완함. 지역 선택·부산 Scope·REGION_APPLICABILITY 정책 변경 없음.
- INV-006/008: 원본 저장 추가 및 최종 체류시간의 활동 중복 합산 없음.
- INV-007: 개발자가 승인한 범위 내에서 반영함. 복잡한 운영조건과 외부 데이터별 세부 정책은 새로 확정하지 않음.
- Domain·RuleRegistry·Port/Adapter의 책임과 외부 DTO 격리 원칙 변경 없음. 불변조건·Architecture 문서를 추가 수정할 필요 없음.

### 자체 검토에서 조정한 사항

- 체류 합계만으로 초과가 증명돼도 정확한 총시간을 계산 불가로 남기는 조건은 이동시간이 미확인인 경우로 한정함. 모든 이동시간이 확인된 일정의 정상 계산까지 막지 않도록 문구를 조정함.
- Evaluation 공통 조건에서 미확인 데이터에 의존하는 평가까지 PASS로 주어지지 않도록 제외 범위를 명시함.
- EVAL-321의 VERIFIED는 다른 적용 대상 항목이 모두 실제 평가됐다는 명세상 공통 조건에서만 기대함. 실제 미지원 항목을 PASS로 간주하는 제품 정책이 아님.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 추가 정책 판단 요청 없음. TASK-008의 승인된 방향과 범위 제한을 따르며, 아직 정하지 않은 정책은 후속 작업에 명시적으로 남김.

### 개발자 결정

- TASK-008의 실제 Codex B APPROVE를 전달했고 작성된 Evidence를 최종 확인함.
- 이번 명세 반영을 별도 TASK-009로 진행하는 방향에 동의하고 기본 Rule에 합의된 보완 사항을 추가하도록 지시함.
- 공통 계약과 Evaluation을 일치시켜야 한다는 앞선 설명에 따라 함께 반영함. 코드 구현·Commit/Merge는 이번 지시 범위에 포함되지 않음.
- 이후 2026-10-25 개발자가 TASK-009 확인 완료와 커밋까지만 진행할 것을 명시함. 이를 최종 확인 및 관련 문서·TASK-008/009 Evidence의 Commit 승인으로 기록함. Push/Merge는 승인 범위에 포함되지 않음.

## 8. 자동 검증 결과

### Unit Test

- N/A: 문서 전용 변경으로 실행 코드가 없음.

### Integration Test

- N/A: 외부 API·Adapter·진단 엔진 연결 없음.

### Architecture Test

- N/A: 코드 의존성 변경 없음. 6절의 문서 경계·불변조건 수동 검토로 대신하며 자동 Architecture 통과로 기록하지 않음.

### Static Analysis

- 코드 정적 분석 N/A: 실행 코드 변경 없음.
- Node 문서 자체 검사 PASS: 변경 문서 5개의 UTF-8·후행 공백·마지막 개행, 상대 Markdown 링크 21개, Evidence 2개의 13개 절 순서, 기존 Evaluation 본문 보존, 신규 EVAL-315~322의 고유 ID·기대 판정·검증 상태, 핵심 상태·조건 표기를 확인함.
- `git diff --check -- docs/V2/docs/02-diagnosis-rules.md docs/V2/docs/06-evaluation-set.md docs/V2/docs/09-diagnosis-contract.md docs/V2/docs/evidence/TASK-008.md docs/V2/docs/evidence/TASK-009.md` PASS. 아직 추적되지 않은 Evidence 파일의 공백도 위 직접 파일 검사로 확인함.
- 불변조건 문서의 diff가 없음을 확인함. 이번 diff와 기존 사용자 변경을 대조해 모바일 3개 파일·Architecture 문서의 기존 수정이 그대로임을 확인함.

## 9. Evaluation 결과

- EVAL-315~322를 문서에 정의함. 실행 결과가 아니며 런타임 통과로 기록하지 않음.
- EVAL-315/316: 체류 합계만으로 초과 증명 가능/불가와 이동시간 미확인 처리 구분.
- EVAL-317: 기본 권장시간에 활동이 포함됐는지 모르면 비교 검증 불가, 최종 계획시간 계산 유지.
- EVAL-318/319: 해석하지 못하는 운영조건만 있는 경우와 독립적으로 확인된 휴무가 함께 있는 경우 구분.
- EVAL-320/321: 불명확한 통제 적용 범위와 허용된 TMAP 조회 시점 추정을 구분.
- EVAL-322: 통신 실패·의미 불명확한 빈 경로 응답 각각의 확인 불가 처리.
- 실행 Case: N/A. 기존 EVAL-001~314 및 신규 EVAL-315~322의 자동화·실행은 후속 진단 코드 작업에서 수행함.

## 10. Codex B Review

- 출처: 2026-10-25 개발자가 전달한 별도 Codex B Read-Only 독립 리뷰 결과. TASK-009와 실제 문서 변경을 대조한 결과이며 Codex A 자체 검토가 아님.
- **Review Result: APPROVE**. 필수 수정 사항 없음.
- TASK-008의 5개 보완 방향이 Rule·공통 계약·Evaluation에 일관되게 반영됐음을 확인함.
- 이동시간 미확인 중 증명 가능한 초과와 정확한 총시간 계산 불가를 구분하고, 같은 장소의 확인된 휴무와 해석 불가 운영조건을 별도로 기록해 조정 필요를 보존함을 확인함.
- TMAP 조회 시점 예상시간의 기존 사용 정책을 유지함을 확인함.
- EVAL-315~322의 기대 판정·검증 상태가 공통 조건과 집계 정책에 부합함을 확인함. EVAL-321의 VERIFIED도 모든 적용 항목이 평가됐다는 조건에서 타당하다고 검토함.
- Codex B 검증: 기존 Evaluation 본문 보존, 신규 ID 8개 고유성, 링크 21개, UTF-8·공백·개행·diff 검사 통과. 문서 전용 변경으로 런타임 테스트 N/A. 파일 직접 수정 없음.
- 이번 승인은 TASK-009 명세 보완 범위에 한정됨. 진단 엔진 구현 검증은 후속 작업이며, 개발자 최종 확인·Commit/Merge 승인은 별도임.

## 11. Review 이후 수정사항

- 필수 수정 요청 없음. 전달받은 실제 Codex B APPROVE와 검증 범위를 10절에 기록하고 상태를 개발자 최종 확인 대기로 갱신함.
- Rule·공통 계약·Evaluation 및 코드는 추가 변경하지 않음. Evidence 수정 후 문서 구조·링크·상태·공백 검사를 재실행함.
- 개발자의 최종 확인·커밋 지시 수신 후 완료 상태와 승인 범위를 기록함. 정책·검증 사례의 추가 변경은 없음.

## 12. 최종 검증 결과

- [x] 승인된 5개 보완 방향과 두 리뷰 경계를 Rule·공통 계약에 반영
- [x] EVAL-315~322의 재현 조건·기대 Rule 결과·최종 판정·검증 상태 정의
- [x] 문서 구조·링크 21개·기존 Evaluation 보존·핵심 조건·공백 자체 검사 — PASS, 8절 참조
- [x] 핵심 불변조건과 책임·Scope 경계 수동 검토
- Unit / Integration / Architecture / 코드 Static Analysis / Evaluation 실행: N/A(8·9절 사유).
- [x] Codex B 독립 리뷰 — 개발자가 전달한 실제 APPROVE 수신, 10절 참조
- [x] Developer Final Check — 2026-10-25 개발자가 확인 완료 및 커밋까지만 진행을 명시함
- 진단 엔진 구현, 복잡한 예외 지원 확대, 실제 API 성공 연동은 미수행.

## 13. Commit

- Commit Hash: 이 Evidence를 포함한 커밋은 `git log -1 --oneline -- docs/V2/docs/evidence/TASK-009.md`로 확인.
- Commit Message: `docs: clarify diagnosis rules and evaluation cases (TASK-008, TASK-009)`.
- 승인 범위: 관련 명세 문서와 TASK-008/009 Evidence의 커밋까지만. 기존 모바일 3개 파일 및 Architecture 문서 수정은 제외. Push/Merge 미수행.
