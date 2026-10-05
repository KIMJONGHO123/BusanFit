# BusanFit V2

국내 여행 일정의 실행 가능성을 진단하는 서비스.

부산을 첫 번째 집중 검증 지역으로 사용하지만, 핵심 진단 엔진은 전국 공통으로 설계하고 지역별 특화 규칙을 확장할 수 있는 구조를 지향한다.

## 핵심 흐름

```text
Expo App
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
Diagnosis Result
```

## 핵심 개념

- 일정 판정: `POSSIBLE`, `CAUTION`, `ADJUSTMENT_REQUIRED`, `UNDETERMINED`
- 서버는 활동이 포함된 최종 체류시간만 사용하며 활동시간을 다시 더하지 않음
- 검증 상태: `VERIFIED`, `PARTIAL`, `UNKNOWN`
- 전국 공통 Rule과 지역 특화 Rule 분리
- 외부 API는 Port/Adapter 구조로 분리
- `UNKNOWN != SAFE`
- CRITICAL Rule 우선 반영
- AI Agent 구현 → 자동 검증 → 독립 리뷰 → Evidence 기록
- OpenTelemetry 기반 관측과 AIOps Agent 분석

## 문서

- [루트 AGENTS.md](../../AGENTS.md) - AI Agent 및 개발 작업의 최상위 규칙
- `docs/00-project-overview.md` - 프로젝트 목표와 서비스 범위
- `docs/01-architecture.md` - 전체 아키텍처
- `docs/02-diagnosis-rules.md` - Rule 모델과 진단 기준
- `docs/03-invariants.md` - 핵심 불변조건
- `docs/04-ports-and-adapters.md` - 외부 시스템 연동 경계
- `docs/05-development-workflow.md` - Agent 기반 개발 Workflow
- `docs/06-evaluation-set.md` - 재현 가능한 Evaluation 기준
- `docs/07-observability-aiops.md` - 운영 관측과 AIOps
- `docs/08-implementation-roadmap.md` - 실제 구현 시작 순서
- `docs/09-diagnosis-contract.md` - 확정 모바일·서버 입력·결과 계약
- `docs/evidence/TEMPLATE.md` - Task Evidence 템플릿

## 첫 구현 권장 순서

1. Domain 기본 타입과 `DiagnosisContext` 정의
2. `DiagnosisRule`, `RuleResult`, `RuleRegistry` 골격 구현
3. 전국 공통 Rule 중 외부 API 의존성이 적은 규칙부터 구현
4. Port 인터페이스 정의
5. TMAP / TourAPI / 기상청 Adapter 연결
6. 부산 지역 Rule 연결
7. Evaluation Set 구축
8. OpenTelemetry 및 운영 지표 추가

자세한 단계는 `docs/08-implementation-roadmap.md`를 따른다.
