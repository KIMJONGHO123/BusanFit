# Ports and Adapters

## 1. 목적

Diagnosis Domain이 TMAP, TourAPI, 기상청, 부산 공공데이터, MySQL의 구체 구현에 직접 의존하지 않도록 한다.

## 2. 구조

```text
Diagnosis Domain
      ↓
     PORT
      │
      ├─ TravelTimePort
      │      ↓
      │   TMAP Adapter
      │
      ├─ TourismPort
      │      ↓
      │   TourAPI Adapter
      │
      ├─ WeatherPort
      │      ↓
      │   기상청 Adapter
      │
      ├─ RegionalDataPort
      │      ↓
      │   Busan Public Data Adapter
      │
      └─ Repository Port
             ↓
          MySQL Adapter
```

## 3. Port 책임

### TravelTimePort

Domain이 필요한 이동시간 / 경로 정보를 요청하기 위한 경계.

### TourismPort

관광지 및 운영정보를 Domain에서 사용할 수 있는 형태로 제공하기 위한 경계.

### WeatherPort

날씨와 위험정보를 Domain에서 사용할 수 있는 형태로 제공하기 위한 경계.

### RegionalDataPort

지역 특화 Rule이 필요한 공공데이터를 제공하기 위한 경계.

### Repository Port

일정, 결과, Rule 결과 등 서비스 저장소와 Domain 사이의 경계.

## 4. Adapter 원칙

Adapter는 외부 시스템의 DTO, 오류 코드, 통신 세부사항을 내부 모델로 변환한다.

Domain은 다음을 몰라야 한다.

- TMAP 응답 JSON 구조
- TourAPI 원본 필드명
- 기상청 API의 원시 응답 규격
- 부산 공공데이터 API의 통신 세부사항
- MySQL/JPA의 저장 구현 세부사항

## 5. 실패 처리

외부 데이터 확인 실패 시:

1. 실패 사실을 숨기지 않는다.
2. 필요한 Rule의 판정 가능 여부를 평가한다.
3. PARTIAL / UNKNOWN 여부에 반영한다.
4. UNKNOWN을 안전으로 변환하지 않는다.

외부 시스템 실패 정책은 Rule과 검증 상태 설계를 함께 고려한다.
