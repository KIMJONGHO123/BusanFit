# TASK-002 Evidence

최종 상태: **완료 — 명세 확정, 실제 Codex B APPROVE 및 개발자 최종 확인 완료**.
완료 범위는 문서 명세이며 서버·모바일 구현 완료를 뜻하지 않는다.

## 1. Task ID

TASK-002

## 2. Goal

모바일·서버 공통 진단 명세를 확정하고 관련 문서의 판정·체류시간 정책을 일치시킨다. 코드 구현은 포함하지 않는다.

## 3. 관련 요구사항

- 서버는 최종 계획 체류시간에 활동시간을 다시 더하지 않는다.
- 판정 불가는 decision: null 대신 UNDETERMINED이다.
- 서버 중심 진단, 초 단위 계산, 공통 장소 ID, 동일 경로 스냅샷과 검증 상태 노출을 명세화한다.

## 4. 관련 문서 / Rule

- 루트 AGENTS.md
- ../01-architecture.md, ../02-diagnosis-rules.md, ../03-invariants.md
- ../06-evaluation-set.md, ../09-diagnosis-contract.md

## 5. 변경 파일

- AGENTS.md, apps/mobile/AGENTS.md
- docs/V2/README.md
- docs/V2/docs/01-architecture.md
- docs/V2/docs/02-diagnosis-rules.md
- docs/V2/docs/03-invariants.md
- docs/V2/docs/06-evaluation-set.md
- docs/V2/docs/08-implementation-roadmap.md
- docs/V2/docs/09-diagnosis-contract.md
- 이 Evidence

## 6. Codex A 주요 판단

- 기존 계산 구현의 완료로 기록하지 않고 구현 기준 문서로 구분한다.
- confirmed ADJUSTMENT_REQUIRED를 UNDETERMINED로 덮지 않는다.
- UNDETERMINED와 검증 상태 UNKNOWN을 독립적으로 집계한다.
- 계획 체류시간과 권장시간 비교를 일정 시간 합산에서 분리한다.
- 루트 AGENTS의 참조 경로와 모바일의 삭제된 정책 참조를 실제 V2 문서로 맞춘다.

## 7. 개발자 결정

2026-10-05 사용자가 앞선 제안 내용을 명세로 확정하도록 지시했다.
활동시간 추가 합산 금지를 명확히 하고 null 대신 UNDETERMINED 사용을 직접 지정했다.

개발자는 별도 Codex B 세션의 `/review` 최종 APPROVE 결과를 전달하고
“TASK-002 최종 확정 해줘”라고 지시했다. 이를 이 문서 작업의 개발자 최종 확인으로 기록한다.
이후 개발자가 “커밋해줘”라고 명시하여 TASK-002 관련 문서 변경의 커밋을 승인했다. Merge / Push 지시는 포함되지 않았다.

## 8. 자동 검증 결과

Unit / Integration / Architecture / Static Analysis: N/A. 문서 전용 변경이며 실행 코드 변경이 없어 관련 코드 검증은 실행하지 않았다.
Node 읽기 전용 검사로 계약 핵심 표기 5개와 변경 문서 10개의 Markdown 링크 5개를 확인했다.
git diff --check 통과. 코드 파일 변경 없음.
내부 참고 검토 후 자체 재검사: 계약 핵심 표기 8개, 링크 5개, 문서 전용 변경 범위와 후행 공백 검사 통과.

## 9. Evaluation 결과

EVAL-301~314를 명세에 추가했다. 코드 실행 사례는 향후 구현 작업에서 자동화한다.
Evaluation 실행: N/A. 평가 사례의 문서 정의이며 엔진 구현·실행은 이번 작업 범위에 포함하지 않았다.

## 10. Codex B Review

최종 결과: **APPROVE**.
출처: 개발자가 전달한 별도 Codex B 세션의 `/review` 결과. 내부 서브에이전트 검토 결과가 아니다.

### 최종 리뷰 원문

> << Code review finished >>
>
> APPROVE. The changes are documentation-only, and no actionable contradictions or invariant violations were found. The contract distinguishes decision from verification status, preserves confirmed adjustment requirements, and explicitly handles unknown regional applicability. Runtime tests were not applicable.

### 초기 리뷰와 대응 이력

개발자가 `codex B:`로 전달했던 실제 초기 리뷰 내용은 다음과 같다.

> [P2] 장소의 지역을 확인하지 못했을 때 검증 상태를 어떻게 집계할지 불명확합니다.

리뷰 근거: 지역 미확인 항목을 집계에서 제외하면 지역 통제를 확인하지 못했는데도 VERIFIED가 될 수 있어 INV-001 / INV-005 위반 구현의 여지가 있다.
리뷰 제안: 지역 진단 적용 가능성 확인을 UNVERIFIABLE로 기록하고 검증 상태에 반영하며 특정 지역 Rule은 추측 실행하지 않는다. 평가 사례도 추가한다.
Codex A 확인: 실제 누락에 해당한다. 앞서 추가한 09 명세 6·7·9절과 EVAL-312~314가 해당 지적을 해소하는지 재확인했다.
초기 전달 내용은 수정 지적이었다. 이후 보완에 대한 실제 최종 승인 결과는 위 원문에 기록했다.

기록 정정: Codex A가 실행한 내부 서브에이전트 참고 검토를 Codex B 공식 리뷰로 표시했던 기존 APPROVE·재승인 표기를 철회한다.
내부 참고 검토는 실제 수행됐지만 AGENTS.md 9절의 개발자 주도 별도 세션 리뷰를 대체하지 않는다.

## 11. Review 이후 수정사항

RuleResult에 target을 추가하고 장소·이동 구간·일정 전체의 평가 단위를 정의했다.
동일 운영시간 Rule의 장소별 성공·실패를 별도 결과로 남기는 EVAL-311을 추가했다.
위 수정은 내부 참고 검토에 따른 보완이며 개발자가 전달한 Codex B 최종 승인으로 간주하지 않는다.
개발자가 전달한 공식 P2에 대응하는 지역 집계 보완은 14절에 기록한다. 기존 보완이 반영돼 있어 중복 수정하지 않았다.

## 12. 최종 검증 결과

Codex A 문서 계약·링크·diff 자체 검증 완료.
Codex B의 실제 최종 APPROVE와 개발자의 TASK-002 최종 확정 지시를 확인했다.

- [x] 요구사항 문서 반영 및 Evidence 작성
- [x] 핵심 불변조건 문서 검토
- [x] P2 보완 반영 및 문서 자체 재검증
- [x] Codex B 독립 리뷰 완료 — 실제 `/review` APPROVE
- [x] 개발자 최종 확인 완료 — TASK-002 최종 확정 지시
- Unit / Integration / Architecture / Static Analysis: N/A. 문서 전용 변경이며 실행 코드 변경 없음.
- Evaluation 실행: N/A. EVAL-301~314는 향후 코드 구현 시 실행할 명세 사례.

TASK-002는 문서 작업으로 최종 완료한다. 코드 구현·실행 검증 완료로 표시하지 않는다.

## 13. Commit

개발자 승인에 따라 이 Evidence와 TASK-002 관련 문서를 함께 커밋한다.

- Commit Message: `docs: finalize V2 diagnosis contract (TASK-002)`
- Commit Hash: 이 Evidence를 포함하는 커밋의 해시는 `git log -1 -- docs/V2/docs/evidence/TASK-002.md`로 확인한다.
- Merge / Push: 수행하지 않는다.

## 14. 지역 미확인 집계 보완

사용자가 전달한 P2 리뷰를 확인한 결과, 기존 명세는 지역 확인 실패가 검증 집계에서 제외될 여지를 남겼다.
INV-001 / INV-005를 명확하게 적용하는 보완이며 새로운 위험 판정 정책을 도입하지 않는다.

- 09 명세: 장소별 REGION_APPLICABILITY 공통 확인 항목, UNVERIFIABLE 집계와 coverage 병행 표시를 명시.
- 지역 미확인 시 특정 지역 Rule은 추측 실행하지 않으며 VERIFIED는 금지.
- 다른 평가 성공 시 PARTIAL, 모두 확인 불가 시 UNKNOWN. 알려진 조정 필요는 유지.
- 06 Evaluation: EVAL-312~314 추가. 코드 실행 완료가 아닌 구현 시 검증할 사례.
- 코드 변경 없음. Node 읽기 전용 검사: 지역 집계 표기, 평가 사례 3개, 링크·후행 공백 검사 통과. git diff --check 통과.
- 내부 서브에이전트 참고 검토에서 지역 집계 보완을 확인했다. 이는 공식 Codex B 리뷰 또는 승인이 아니다.
- 개발자가 실제 Codex B의 해당 P2 리뷰를 전달했다. 수신 후 Node 검사로 지역 집계 표기와 EVAL-312~314 정의를 재확인하고 git diff --check를 통과했다.
- 이후 개발자가 실제 Codex B `/review` APPROVE를 전달하고 TASK-002 최종 확정을 지시했다. 최종 결과·원문·완료 상태는 7·10·12절에 기록했다.
