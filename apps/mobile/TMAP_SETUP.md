# TMAP 지도 실행

Android/iOS 지도는 `react-native-webview` 안에서 TMAP JavaScript v2 지도 SDK를 실행합니다.
Expo SDK 57의 Expo Go에 WebView가 포함되어 있어 별도 네이티브 TMAP 모듈 없이 사용할 수 있습니다.
지도 배경, 관광지 마커, 도로 경로선에 Google Maps를 사용하지 않습니다.
기존 웹 화면은 앱 이용 안내를 유지합니다.

1. TMAP 콘솔에서 JavaScript 지도 SDK 사용 권한이 있는 앱 키를 준비합니다.
2. `apps/mobile/.env.local`에 `EXPO_PUBLIC_TMAP_MAP_APP_KEY=발급받은_지도용_키`를 설정합니다.
3. 모바일 폴더에서 `npx expo start --clear`로 개발 서버를 재시작한 뒤 Expo Go에서 앱을 다시 엽니다.

이 키는 클라이언트에 포함됩니다. 서버 전용 키나 다른 서비스 키를 넣지 마세요.
서버의 `TMAP_APP_KEY`는 기존 자동차 경로 API에서 계속 사용하며 앱으로 자동 전달하지 않습니다.
키의 지도 상품 권한과 사용 제한은 TMAP 콘솔에서 확인해야 합니다. 서버 API 호출 성공만으로
JavaScript 지도 SDK 사용 권한이 확인되는 것은 아닙니다.

지도는 `https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=...`에서 SDK를 불러옵니다.
키가 없으면 설정 안내, 로딩 실패 시에는 오류 안내와 재시도 버튼을 표시합니다.
빈 좌표나 잘못된 좌표를 반환한 경로는 실패 구간으로 처리합니다.
API의 경로 조회 성공과 실제 지도 로딩 성공은 별개입니다.

검증: 관광지 3곳 선택 → 지도 → 번호 마커 3개와 도로를 따르는 구간 2개 확인 →
전체 경로 보기 버튼 확인 → 일정 변경 후 이전 선/마커가 제거되는지 확인.

공식 자료:
- https://docs.expo.dev/versions/v57.0.0/sdk/webview/
- https://tmapapi.tmapmobility.com/main.html#webv2/sample/webSample01
- https://tmapapi.tmapmobility.com/main.html#webv2/sample/webSample78
- https://tmapapi.tmapmobility.com/main.html#webv2/sample/webSample89
