# BusanFit 서버

Java 21과 로컬 MySQL을 사용하는 Spring Boot 서버입니다. 웹은 `/api` 요청을 이 서버의 8080 포트로 전달합니다.

## 로컬 실행

1. MySQL을 실행하고 사용할 DB와 계정을 준비합니다.
2. `src/main/resources/application-env.example.yaml`을 같은 폴더의 `application-env.yaml`로 복사합니다. 기존 파일이 있으면 덮어쓰지 않습니다.
3. DB 접속 설정을 입력하고 `PUBLIC_DATA_SERVICE_KEY`에 공공데이터포털의 **Decoding 인증키**를 입력합니다. 실제 설정 파일은 Git에서 제외됩니다. 서버 환경 변수로 설정하는 것도 가능합니다.
4. 서버를 실행합니다.

```powershell
cd C:\BusanFit\apps\server
.\gradlew.bat bootRun
```

TourAPI는 [한국관광공사 국문 관광정보 서비스](https://www.data.go.kr/data/15101578/openapi.do)의 활용신청과 유효한 인증키가 필요합니다. 키를 웹의 `VITE_` 변수나 커밋하는 파일에 넣지 않습니다.

## 실제 검색 연결

```text
React 웹 :5173
  → Vite /api 프록시
  → Spring Boot :8080 /api/places/search
  → TourApiClient
  → https://apis.data.go.kr/B551011/KorService2
```

- 검색어가 있으면 `/searchKeyword2`, 없으면 `/areaBasedList2`를 호출합니다.
- 현재 검색 범위는 법정동 시도코드 기준 부산(`lDongRegnCd=26`) 관광지(`contentTypeId=12`)입니다. 기존 `areaCode=6`은 사용하지 않습니다.
- 공식 명세에서 `/areaCode2`는 미사용·삭제 예정으로 안내합니다. 지역코드 확인은 `/ldongCode2`를 사용하며 부산광역시는 `26`입니다. 기존 지역코드가 비어 있는 감천문화마을도 법정동 지역 조건으로 조회합니다.
- `GET /api/places/search?keyword=해운대&page=1&size=20`은 비로그인 조회가 가능합니다.
- `tourapi-{contentid}` ID와 실제 이름·주소·좌표·사진 URL을 웹에 제공합니다. ID·이름·유효한 좌표가 없는 항목은 제외합니다.
- 성공 응답의 빈 페이지는 `[]`, 외부 HTTP·통신·파싱·응답 구조 오류는 `502`로 구분합니다. 외부 오류 본문을 사용자에게 그대로 노출하지 않습니다.
- 기존 배열 응답 계약은 전체 페이지 수를 제공하지 않습니다. 필터링된 빈 페이지가 검색 전체의 끝을 뜻하지는 않습니다.
- 검색 DTO의 기존 `estimatedStayMinutes: 90`은 호환성을 위한 레거시 값이며 TourAPI의 권장 체류시간이 아닙니다. 현재 웹은 이 값을 사용하지 않습니다.

2026-10-26 TASK-010에서 실행 서버·MySQL·TourAPI와 React 웹을 통한 실제 검색·선택·일정 편집을 검증했습니다. 현재 화면의 상세 보기는 검색 응답에 포함된 정보만 표시합니다. TourAPI 상세정보 API, V2 진단 엔진 및 검색 ID의 진단 연결은 후속 작업입니다. 기존 진단은 하드코딩된 장소 목록을 사용합니다.

## 검증

```powershell
.\gradlew.bat check
```

자동 테스트는 H2와 합성 외부 응답을 사용합니다. 실제 TourAPI를 호출하는 웹 검증은 [웹 실행 문서](../web/README.md)의 별도 명령으로 실행합니다.

- [작업 근거 TASK-010](../../docs/V2/docs/evidence/TASK-010.md)
