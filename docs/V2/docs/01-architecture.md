# BusanFit V2 Architecture

## 1. 전체 구조

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
응용 계층
 ↓
일정 입력 검증
 ↓
Diagnosis Context
 ↓
Diagnosis Engine
 ↓
Rule Registry
 ↓
적용 가능한 Rule 선택
 ↓
전국 공통 Rule + 지역 특화 Rule
 ↓
Rule Result 집계
 ↓
Diagnosis Result
 ↓
일정 판정 + 검증 상태
 ↓
최종 진단 결과
 ↓
Expo 앱
```

## 2. 입력 검증

진단 엔진에 진입하기 전에 최소 다음을 확인한다.

- 장소 ID 존재 여부
- 좌표 존재 여부
- 방문시간 유효성
- 체류시간 유효성
- 일정 순서 유효성
- 필수 데이터 누락 여부

입력이 유효하지 않은 경우 잘못된 데이터를 바탕으로 억지 판정을 생성하지 않는다.

## 3. Diagnosis Context

`DiagnosisContext`는 각 Rule이 진단에 필요한 정보를 읽는 공통 입력 모델이다.

구현 시 Context가 특정 외부 API 응답 DTO에 종속되지 않도록 한다.

예:

```text
DiagnosisContext
 ├─ 일정 정보
 ├─ 장소 정보
 ├─ 시간 정보
 ├─ 이동 정보
 ├─ 관광지 운영 정보
 ├─ 기상 정보
 ├─ 지역 정보
 └─ 데이터 검증 가능 여부
```

구체 필드는 구현 과정에서 확정하되 Rule이 외부 API Adapter에 직접 접근하지 않는 구조를 유지한다.

## 4. Diagnosis Engine

Diagnosis Engine의 책임:

1. 입력된 Context를 사용한다.
2. Rule Registry에서 실행할 Rule을 가져온다.
3. 각 Rule을 평가한다.
4. Rule Result를 수집한다.
5. 일정 판정과 검증 상태를 만든다.
6. 사용자에게 보여줄 판단 근거와 문제 원인을 구성한다.

## 5. Rule Registry

Rule Registry의 책임:

- 일정 지역 확인
- 전국 공통 Rule 선택
- 해당 지역 특화 Rule 선택
- Scope 검증
- 실행 Rule 반환

지역별 조건 분기가 Diagnosis Engine 내부에 흩어지지 않게 한다.

잘못된 예:

```java
if (region.equals("BUSAN")) {
    // 부산 전용 로직 수십 줄
}
```

지향 구조:

```text
Diagnosis Engine
      ↓
Rule Registry
      ↓
National Rules + Busan Rules
```

## 6. 전국 확장 구조

```text
Diagnosis Engine
 ↓
전국 공통 Rule
 ↓
┌──────────┬──────────┬──────────┐
│ 부산      │ 서울      │ 제주      │
│ 부산 Rule │ 서울 Rule │ 제주 Rule │
└──────────┴──────────┴──────────┘
```

초기에는 부산만 지역 특화 Rule을 구현해도 된다.

## 7. Region Coverage Metadata

지역별 지원 범위를 명시할 수 있어야 한다.

예상 개념:

```text
Region Coverage Metadata
 ├─ 지역 코드
 ├─ 전국 공통 Rule 지원 여부
 ├─ 지역 특화 Rule 지원 여부
 ├─ 사용 가능한 지역 데이터
 └─ 미지원 진단 항목
```

이 정보는 PARTIAL / UNKNOWN 판단 근거에도 사용될 수 있다.
