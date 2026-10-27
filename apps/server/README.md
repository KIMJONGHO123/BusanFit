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

2026-10-26 TASK-010에서 실행 서버·MySQL·TourAPI와 React 웹을 통한 실제 검색·선택·일정 편집을 검증했습니다. 관광지 상세 보기는 검색 응답에 포함된 정보만 표시합니다. V2 진단 연결은 아래 TASK-011/012 범위를 참조합니다. 기존 `/api/planner/diagnose`는 전환 기간 동안 하드코딩된 장소 목록을 사용하는 V1 API로 유지합니다.

## V2 진단 API

`POST /api/v2/planner/diagnose`는 기존 진단과 동일하게 로그인 Bearer 토큰이 필요합니다.
검색의 `tourapi-{contentid}` ID를 그대로 받으며 TourAPI `/detailCommon2`에서 장소·좌표·법정동 시도코드를 다시 확인합니다.
웹에서 보낸 좌표·장소 설명을 관광지 근거로 사용하지 않습니다.

```json
{
  "travelDate": "2026-11-01",
  "startTime": "09:00",
  "endTime": "18:00",
  "timeZone": "Asia/Seoul",
  "transportMode": "CAR",
  "departure": { "name": "부산역", "latitude": 35.1151, "longitude": 129.0414 },
  "stops": [{
    "placeId": "tourapi-1997221",
    "plannedStaySeconds": 6000,
    "activities": [{ "code": "rest", "durationSeconds": 2700 }]
  }]
}
```

- `plannedVisitTime`은 선택적인 `HH:mm` 고정 방문시간입니다. 조기 도착 시 대기하고 지각·일정 충돌·종료 초과를 평가합니다.
- 최종 `plannedStaySeconds`만 일정에 반영합니다. 활동시간은 표시·검증에 사용하며 다시 합산하지 않습니다. 휴식·기타는 사용자 지정시간을 유지합니다.
- 출발지→첫 장소부터 요청 순서대로 TMAP 자동차 경로를 조회합니다. 초 단위 시간·거리·경로 좌표는 같은 진단 응답의 `schedule.segments`에 함께 포함됩니다. 지도 연결 시 이 스냅샷을 사용해야 합니다.
- `decision`과 `verificationStatus`를 함께 제공합니다. 운영정보·권장시간·날씨·지역 통제는 현재 미지원/미확인으로 `ruleResults`와 `coverage`에 남기므로 실제 API의 시간 계산이 성공해도 `PARTIAL`입니다.
- 이동 미확인 이후 예상시각·정확한 총시간·잔여시간은 `null`, `calculationComplete`는 `false`입니다. 확인된 조정 필요가 없으면 `UNDETERMINED`이며, 체류시간만으로 초과가 증명되면 `ADJUSTMENT_REQUIRED`를 유지합니다.
- TMAP은 조회 시점 예상시간을 제공합니다. 미래 출발시각 예측으로 표시하지 않습니다.
- 요청 오류와 정상 조회로 확인된 존재하지 않는 ID는 `400`입니다. 외부 장애는 `200` 진단 응답 안의 확인 불가 상태로 반영하고 가능한 다른 평가를 계속합니다.
- 임계값은 `diagnosis.low-remaining-seconds`(기본 1800), `diagnosis.high-travel-ratio`(기본 0.4)로 설정합니다.

웹의 ‘진단하기’ 버튼은 로그인 후 V2 API를 호출하고 판정·검증 상태·예상 일정·경로 미리보기를 표시합니다(TASK-012). ‘입력 확인’은 형식만 검사하는 보조 기능으로 유지합니다. 운영시간 파서·부산명소정보 연결·DB 저장·주기적 갱신은 후속 범위입니다.

웹의 POST 요청을 위해 CORS 기본 허용 주소는 기존 `http://localhost:8081`과 Vite의 `http://127.0.0.1:5173`, `http://localhost:5173`입니다. `app.cors.allowed-origins`로 배포 환경의 정확한 주소 목록을 지정할 수 있습니다. 인증 요구와 JWT 검증은 그대로 유지하며 자격증명 허용에 wildcard origin을 사용하지 않습니다.

`diagnosisWebTestServer` Gradle 태스크는 `BUSANFIT_LIVE_WEB_DIAGNOSIS=1`일 때만 실행하는 브라우저 테스트용 서버입니다. 18080 포트, H2 메모리 DB·별도 테스트 JWT 설정을 강제하고 5174 테스트 웹 주소를 허용합니다. 실제 API 키만 비공개 서버 설정에서 읽습니다. 실행·종료 방법은 [웹 검증 문서](../web/README.md)를 따릅니다.

## 검증

```powershell
.\gradlew.bat check
```

기본 자동 테스트는 H2와 합성 외부 응답을 사용합니다. Domain 의존성은 ArchUnit으로 검증하며, 새 `diagnosis` 패키지의 main/test 소스는 Checkstyle 기본 오류 검사 대상입니다. 레거시 전체의 정적 분석이나 포괄적인 결함 분석을 뜻하지 않습니다.

실제 TourAPI 검색·상세와 TMAP을 사용하는 V2 진단 검증은 다음처럼 명시적으로 실행합니다.

```powershell
$env:BUSANFIT_LIVE_DIAGNOSIS = '1'
try {
    .\gradlew.bat test --tests 'com.busanfit.diagnosis.DiagnosisLiveTest'
} finally {
    Remove-Item Env:BUSANFIT_LIVE_DIAGNOSIS -ErrorAction SilentlyContinue
}
```

실제 키는 서버 환경 변수 또는 Git에서 제외된 기존 `application-env.yaml`에서 읽습니다. 테스트는 임시 HTTP 포트와 H2를 사용하며 실행 중인 8080 서버나 개발 MySQL을 변경하지 않습니다. 실제 호출은 TourAPI 검색 1회·장소 조회 2회·TMAP 경로 2회이며 성공과 체류시간 초과를 확인합니다. 기본 테스트에서는 건너뜁니다. 실제 TourAPI를 호출하는 웹 검색 검증은 [웹 실행 문서](../web/README.md)의 별도 명령으로 실행합니다.

- [작업 근거 TASK-010](../../docs/V2/docs/evidence/TASK-010.md)
- [V2 진단 구현·검증 근거 TASK-011](../../docs/V2/docs/evidence/TASK-011.md)
