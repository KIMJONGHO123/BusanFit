# TASK-004 Evidence

상태: **완료 — Codex B 독립 리뷰 APPROVE 및 개발자 최종 확인 완료**.
작업일: 2026-10-23. 웹 구현 완료를 의미하지 않는다.

## 1. Task ID

`TASK-004`

## 2. Goal

구현 로드맵, 진단 공통 명세와 아키텍처의 프런트엔드 대상을 앱에서 웹으로 변경한다.
기존 진단 계약과 서버의 판단 책임은 유지한다.

## 3. 관련 요구사항

- 개발자 요청: 08-implementation-roadmap.md와 09-diagnosis-contract.md의 앱 기준 표현을 웹으로 수정.
- 기존 apps/mobile은 보관하고 apps/web에서 React + Vite + TypeScript로 웹 우선 개발.
- 후속 개발자 요청: docs/V2/docs/ 전체에서 현재 개발 대상을 앱으로 설명하는 부분을 웹으로 수정.

## 4. 관련 문서 / Rule

- [AGENTS.md](../../../../AGENTS.md)
- [Architecture](../01-architecture.md)
- [Rules](../02-diagnosis-rules.md)
- [Invariants](../03-invariants.md)
- [Roadmap](../08-implementation-roadmap.md)
- [진단 계약](../09-diagnosis-contract.md)

## 5. 변경 파일

- `AGENTS.md` — 웹 우선 서비스 흐름 반영.
- `docs/V2/docs/00-project-overview.md` — 웹 우선 서비스 흐름 반영.
- `docs/V2/docs/01-architecture.md` — 작업 시작 전 존재하던 변경을 보존하고 결과 표시 대상·공통 명세 참조 두 곳만 추가 수정.
- `docs/V2/docs/08-implementation-roadmap.md`
- `docs/V2/docs/09-diagnosis-contract.md`
- `docs/V2/docs/evidence/TASK-004.md`

## 6. Codex A 주요 판단

### 구현 방식

- 로드맵에 웹 우선 대상과 기존 모바일 보관 방향을 명시하고 Phase 7 연결 대상을 React 웹으로 변경.
- 공통 명세 제목, 클라이언트 책임, 활동 정책 조회, 장소 설명 검증, 체류시간 제안, API 연결 표현을 웹 기준으로 변경.
- 후속 요청에 따라 docs/V2/docs/ 전체의 앱·모바일·Expo 표현을 조사하고 아키텍처의 결과 표시 대상과 공통 명세 참조를 웹으로 변경.
- 로드맵의 기존 모바일 보관·추후 개발 설명과 과거 Evidence의 실제 모바일 소스·테스트·승인 기록은 역사적 사실이므로 유지. TASK-003의 후속 모바일 전환 제안은 당시 제안이며, 현재 구현 대상은 로드맵과 이번 Evidence의 웹 우선 방향을 따른다.
- API 필드, 시간 계산, Rule 집계, 검증 상태, 서버 판단 책임은 변경하지 않음.

### 기존 구조와의 관계

- 루트 AGENTS.md의 React 웹(Vite + TypeScript) 방향과 일치.
- 실행 코드와 기존 모바일 파일은 수정하지 않음. 작업 시작 시 존재하던 다른 변경과 TASK-003은 유지.
- Rule 충돌, 지역 Scope 변경, UNKNOWN의 안전 간주, Domain/Adapter 책임 변경 없음.

### 구현 중 발견한 문제

- 최초 요청 때 발견한 01-architecture.md의 결과 표시 대상·공통 명세 참조 명칭 불일치는 후속 범위 확대 요청에 따라 웹 기준으로 수정함.

## 7. 구현 전 개발자 판단 요청

### Agent가 요청한 판단

- 신규 정책 판단 요청 없음. 웹 전환은 개발자의 기존 지시 및 이번 수정 요청에 따름.

### 개발자 결정

- 기존 앱은 유지하고 웹을 별도로 개발하는 방향. 최초 두 문서 수정 요청 이후 docs/V2/docs/ 전체로 용어 정리 범위가 확대됨. 웹 구현 착수나 기존 진단 정책 변경은 포함하지 않음.

## 8. 자동 검증 결과

### Unit Test

- 결과: N/A. 문서 변경만 있으며 실행 코드 변경 없음.
- 명령: 실행하지 않음.

### Integration Test

- 결과: N/A. API 및 외부 연동 코드 변경 없음.
- 명령: 실행하지 않음.

### Architecture Test

- 결과: N/A. 코드 의존 관계 변경 없음.
- 명령: 실행하지 않음.

### Static Analysis

- 결과: 코드 분석기 N/A. 문서 차이·용어·로컬 링크 및 공백 자체 검증 수행.
- 명령: `git diff --check -- docs/V2/docs/`; `rg -n '앱|모바일|Expo|apps/mobile|mobile' docs/V2/docs`; 변경 문서 로컬 링크·후행 공백 확인. 남은 표현은 기존 모바일 보관 설명 또는 과거 Evidence 기록임을 확인.

## 9. Evaluation 결과

- 실행 Case: N/A. Rule 및 계약의 동작 정책 변경 없음.
- 결과: 기존 Evaluation 통과 상태를 변경하지 않음.

## 10. Codex B Review

### 요구사항 / Rule / Architecture / 불변조건 / 테스트 누락 여부 / Evaluation

- 출처: 2026-10-23 개발자가 전달한 별도 Codex B 세션의 독립 리뷰 결과. Codex A 자체 검토가 아님.
- 필수 수정 사항 없음.
- 웹 우선 개발 방향이 로드맵·아키텍처·공통 명세에 일치함.
- 진단 계약, 서버 판단 책임, 핵심 불변조건이 유지됨.
- 문서 전용 변경이므로 테스트·Evaluation의 N/A 사유가 타당함.
- 로컬 링크·후행 공백 검사와 `git diff --check` 통과를 확인함.
- 리뷰·개발자 승인 대기 상태가 적절히 기록됨.
- Codex B는 파일을 수정하지 않았으며 개발자 최종 확인이 남아 있음을 명시함.

### Review Result

- **APPROVE**. 개발자가 전달한 실제 리뷰 결론을 기록함.

## 11. Review 이후 수정사항

- 필수 수정 요청 없음. 전달받은 독립 리뷰 결과와 개발자 최종 확인 대기 상태만 Evidence에 반영함.
- 2026-10-23 개발자가 최종 확인 후 푸시까지 지시함. 완료 상태와 커밋 범위를 기록함. 기존 웹 방향 변경인 AGENTS.md·프로젝트 개요·아키텍처의 입력 흐름도 함께 포함하며, 아키텍처 예시 코드 주석화와 모바일 코드 변경은 제외함.

## 12. 최종 검증 결과

- [x] 로드맵·진단 계약·아키텍처의 웹 기준 표현 반영 및 docs/V2/docs/ 전체 용어 조사
- [x] 문서 차이·용어·로컬 링크·공백 자체 검증
- [x] Invariant Check — 동작 정책 변경 없음, 핵심 계약 보존 확인
- Unit / Integration / Architecture / 코드 Static Analysis / Evaluation: N/A(문서 전용 변경).
- [x] Codex B Review — 개발자가 실제 APPROVE 결과 전달
- [x] Developer Final Check — 2026-10-23 개발자가 최종 확인 및 커밋·푸시 승인

## 13. Commit

- Commit Hash: 이 문서를 포함하는 커밋의 Git 이력 참조.
- Commit Message: `docs: align V2 documentation with web-first development (TASK-004)`
- 개발자 승인에 따라 커밋·푸시 진행. Merge는 범위에 포함하지 않음.
