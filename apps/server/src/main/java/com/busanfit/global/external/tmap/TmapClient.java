package com.busanfit.global.external.tmap;

import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import com.busanfit.global.external.tmap.dto.TmapRouteCoordinate;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class TmapClient {

    private final RestClient tmapRestClient;
    private final TmapProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TmapCarRouteResult getCarRoute(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    ) {
        validateCoordinate("출발지", startLatitude, startLongitude);
        validateCoordinate("목적지", endLatitude, endLongitude);
        validateAppKey();

        try {
            TmapHttpResponse response = callTmapCarRoute(
                    startLatitude,
                    startLongitude,
                    endLatitude,
                    endLongitude
            );

            if (response.statusCode().isError()) {
                throw new TmapApiException("TMAP 자동차 경로안내 API 오류입니다. status="
                        + response.statusCode().value());
            }

            return parseRouteResult(response.body());
        } catch (ResourceAccessException e) {
            throw new TmapApiException(buildNetworkErrorMessage(e), e);
        }
    }

    private TmapHttpResponse callTmapCarRoute(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    ) {
        return tmapRestClient.post()
                .uri(uriBuilder -> buildCarRouteUri(uriBuilder))
                .header("appKey", properties.appKey())
                .accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildCarRouteBody(startLatitude, startLongitude, endLatitude, endLongitude))
                .exchange((request, response) ->
                        new TmapHttpResponse(
                                response.getStatusCode(),
                                new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8)
                        )
                );
    }

    private java.net.URI buildCarRouteUri(UriBuilder uriBuilder) {
        return uriBuilder
                .path(properties.carRoutePath())
                .queryParam("version", "1")
                .build();
    }

    private String buildCarRouteBody(
            double startLatitude,
            double startLongitude,
            double endLatitude,
            double endLongitude
    ) {
        // TMAP 공식 문서 기준 X는 경도(longitude), Y는 위도(latitude)입니다.
        return String.format(Locale.ROOT, """
                {
                  "startX": %.7f,
                  "startY": %.7f,
                  "endX": %.7f,
                  "endY": %.7f,
                  "reqCoordType": "WGS84GEO",
                  "resCoordType": "WGS84GEO",
                  "searchOption": 0,
                  "trafficInfo": "N"
                }
                """,
                startLongitude,
                startLatitude,
                endLongitude,
                endLatitude
        );
    }

    private TmapCarRouteResult parseRouteResult(String body) {
        try {
            JsonNode rawResponse = objectMapper.readTree(body);
            JsonNode propertiesNode = findSummaryProperties(rawResponse);

            int totalTimeSeconds = readRequiredInt(propertiesNode, "totalTime");
            int totalDistanceMeters = readRequiredInt(propertiesNode, "totalDistance");
            List<TmapRouteCoordinate> coordinates = readRouteCoordinates(rawResponse);

            // TMAP totalTime은 초 단위입니다. 일정 계산용 분 값은 올림으로 만들어 초 단위 손실을 막습니다.
            int totalTimeMinutes = (int) Math.ceil(totalTimeSeconds / 60.0);

            return new TmapCarRouteResult(
                    totalTimeSeconds,
                    totalTimeMinutes,
                    totalDistanceMeters,
                    coordinates,
                    body
            );
        } catch (RuntimeException e) {
            if (e instanceof TmapApiException) {
                throw e;
            }
            throw new TmapApiException("TMAP 응답 JSON을 파싱할 수 없습니다.", e);
        }
    }

    private JsonNode findSummaryProperties(JsonNode rawResponse) {
        JsonNode features = rawResponse.path("features");
        if (!features.isArray() || features.isEmpty()) {
            throw new TmapApiException("TMAP 응답에 features 정보가 없습니다.");
        }

        JsonNode firstFeatureProperties = features.get(0).path("properties");
        if (firstFeatureProperties.isObject()
                && firstFeatureProperties.hasNonNull("totalTime")
                && firstFeatureProperties.hasNonNull("totalDistance")) {
            return firstFeatureProperties;
        }

        throw new TmapApiException("TMAP 응답에 총 이동시간 또는 총 이동거리 정보가 없습니다.");
    }

    private int readRequiredInt(JsonNode propertiesNode, String fieldName) {
        JsonNode value = propertiesNode.get(fieldName);
        if (value == null || !value.canConvertToInt()) {
            throw new TmapApiException("TMAP 응답 필드가 숫자가 아닙니다: " + fieldName);
        }

        return value.asInt();
    }

    private List<TmapRouteCoordinate> readRouteCoordinates(JsonNode rawResponse) {
        List<TmapRouteCoordinate> coordinates = new ArrayList<>();
        JsonNode features = rawResponse.path("features");
        if (!features.isArray()) {
            return coordinates;
        }

        features.forEach(feature -> {
            JsonNode geometry = feature.path("geometry");
            String geometryType = geometry.path("type").asText();
            JsonNode geometryCoordinates = geometry.path("coordinates");

            if ("LineString".equals(geometryType)) {
                addLineStringCoordinates(coordinates, geometryCoordinates);
            } else if ("MultiLineString".equals(geometryType) && geometryCoordinates.isArray()) {
                geometryCoordinates.forEach(lineString -> addLineStringCoordinates(coordinates, lineString));
            }
        });

        return removeSequentialDuplicates(coordinates);
    }

    private void addLineStringCoordinates(List<TmapRouteCoordinate> coordinates, JsonNode lineString) {
        if (!lineString.isArray()) {
            return;
        }

        lineString.forEach(coordinatePair -> addCoordinatePair(coordinates, coordinatePair));
    }

    private void addCoordinatePair(List<TmapRouteCoordinate> coordinates, JsonNode coordinatePair) {
        if (!coordinatePair.isArray() || coordinatePair.size() < 2) {
            return;
        }

        JsonNode longitudeNode = coordinatePair.get(0);
        JsonNode latitudeNode = coordinatePair.get(1);
        if (longitudeNode == null || latitudeNode == null) {
            return;
        }

        double longitude = longitudeNode.asDouble();
        double latitude = latitudeNode.asDouble();
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) {
            return;
        }

        coordinates.add(new TmapRouteCoordinate(latitude, longitude));
    }

    private List<TmapRouteCoordinate> removeSequentialDuplicates(List<TmapRouteCoordinate> coordinates) {
        List<TmapRouteCoordinate> result = new ArrayList<>();
        TmapRouteCoordinate previous = null;

        for (TmapRouteCoordinate coordinate : coordinates) {
            if (!coordinate.equals(previous)) {
                result.add(coordinate);
            }
            previous = coordinate;
        }

        return result;
    }

    private void validateCoordinate(String label, double latitude, double longitude) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new IllegalArgumentException(label + " 위도 값이 올바르지 않습니다.");
        }
        if (!Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException(label + " 경도 값이 올바르지 않습니다.");
        }
    }

    private void validateAppKey() {
        if (properties.appKey() == null || properties.appKey().isBlank()) {
            throw new TmapApiException("TMAP_APP_KEY가 설정되어 있지 않습니다.");
        }
    }

    private String buildNetworkErrorMessage(ResourceAccessException e) {
        Throwable cause = e.getCause();
        if (cause instanceof SocketTimeoutException) {
            return "TMAP 자동차 경로안내 API 요청 시간이 초과되었습니다.";
        }

        return "TMAP 자동차 경로안내 API에 연결할 수 없습니다.";
    }

    private record TmapHttpResponse(
            HttpStatusCode statusCode,
            String body
    ) {
    }
}
