package com.busanfit.global.external.tourapi;

import com.busanfit.place.PlaceSearchResult;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class TourApiClient {

    // ldongCode2의 부산광역시 시도코드. 기존 areaCode는 미사용/삭제 예정 항목입니다.
    private static final String BUSAN_LEGAL_REGION_CODE = "26";
    private static final String TOURIST_ATTRACTION_CONTENT_TYPE = "12";
    private static final int DEFAULT_STAY_MINUTES = 90;

    private final RestClient tourApiRestClient;
    private final TourApiProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<PlaceSearchResult> searchPlaces(String keyword, int page, int size) {
        validateServiceKey();

        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        int normalizedPage = Math.max(1, page);
        int normalizedSize = Math.min(Math.max(1, size), 30);

        try {
            TourApiHttpResponse response = tourApiRestClient.get()
                    .uri(uriBuilder -> buildSearchUri(
                            uriBuilder,
                            normalizedKeyword,
                            normalizedPage,
                            normalizedSize
                    ))
                    .exchange((request, rawResponse) ->
                            new TourApiHttpResponse(
                                    rawResponse.getStatusCode(),
                                    new String(rawResponse.getBody().readAllBytes(), StandardCharsets.UTF_8)
                            )
                    );

            if (response.statusCode().isError()) {
                throw new TourApiException("TourAPI 관광지 검색 API 오류입니다. status="
                        + response.statusCode().value());
            }

            return parsePlaces(response.body());
        } catch (ResourceAccessException e) {
            throw new TourApiException(buildNetworkErrorMessage(e), e);
        }
    }

    private java.net.URI buildSearchUri(UriBuilder uriBuilder, String keyword, int page, int size) {
        UriBuilder builder = uriBuilder
                .path(keyword.isBlank() ? properties.areaSearchPath() : properties.keywordSearchPath())
                .queryParam("serviceKey", "{serviceKey}")
                .queryParam("MobileOS", "ETC")
                .queryParam("MobileApp", "BusanFit")
                .queryParam("_type", "json")
                .queryParam("pageNo", page)
                .queryParam("numOfRows", size)
                .queryParam("arrange", "C")
                .queryParam("lDongRegnCd", BUSAN_LEGAL_REGION_CODE)
                .queryParam("contentTypeId", TOURIST_ATTRACTION_CONTENT_TYPE);

        if (!keyword.isBlank()) {
            builder.queryParam("keyword", "{keyword}");
        }

        return builder.build(Map.of("serviceKey", properties.serviceKey(), "keyword", keyword));
    }

    private List<PlaceSearchResult> parsePlaces(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode header = root.path("response").path("header");
            String resultCode = header.path("resultCode").asText();
            if (!"0000".equals(resultCode)) {
                // 외부 오류 본문/메시지에는 요청 키가 포함될 수 있으므로 그대로 노출하지 않습니다.
                throw new TourApiException("TourAPI 관광지 검색 API가 성공 응답을 반환하지 않았습니다.");
            }

            JsonNode responseBody = root.path("response").path("body");
            JsonNode items = responseBody.path("items");
            String totalCount = responseBody.path("totalCount").asText();
            if (!responseBody.isObject() || !totalCount.matches("[0-9]+")) {
                throw invalidResponse();
            }

            // 정상 응답의 빈 페이지와 응답 구조 누락을 구분합니다.
            if (items.isString() && items.asText().isBlank()) {
                return List.of();
            }
            if (!items.isObject()) {
                throw invalidResponse();
            }
            JsonNode itemNode = items.path("item");
            List<PlaceSearchResult> places = new ArrayList<>();

            if (itemNode.isArray()) {
                itemNode.forEach(item -> addPlaceIfValid(places, item));
            } else if (itemNode.isObject()) {
                addPlaceIfValid(places, itemNode);
            } else if (!("0".equals(totalCount) && (itemNode.isMissingNode() || itemNode.isNull()))) {
                throw invalidResponse();
            }

            return places;
        } catch (RuntimeException e) {
            if (e instanceof TourApiException) {
                throw e;
            }
            throw new TourApiException("TourAPI 관광지 검색 응답을 파싱할 수 없습니다.", e);
        }
    }

    private TourApiException invalidResponse() {
        return new TourApiException("TourAPI 관광지 검색 응답 형식이 올바르지 않습니다.");
    }

    private void addPlaceIfValid(List<PlaceSearchResult> places, JsonNode item) {
        if (!item.isObject()) {
            throw invalidResponse();
        }
        String contentId = item.path("contentid").asText().trim();
        String title = item.path("title").asText().trim();
        Double latitude = readDouble(item.path("mapy").asText());
        Double longitude = readDouble(item.path("mapx").asText());

        if (contentId.isBlank() || title.isBlank() || latitude == null || longitude == null
                || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            return;
        }

        String address = firstNonBlank(item.path("addr1").asText(), item.path("addr2").asText());
        String imageUrl = firstNonBlank(item.path("firstimage").asText(), item.path("firstimage2").asText());

        places.add(new PlaceSearchResult(
                "tourapi-" + contentId,
                title,
                address,
                "관광지",
                latitude,
                longitude,
                imageUrl.isBlank() ? null : imageUrl,
                DEFAULT_STAY_MINUTES
        ));
    }

    private Double readDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            double coordinate = Double.parseDouble(value);
            return Double.isFinite(coordinate) ? coordinate : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return "";
    }

    private void validateServiceKey() {
        if (properties.serviceKey() == null || properties.serviceKey().isBlank()) {
            throw new TourApiException("PUBLIC_DATA_SERVICE_KEY가 설정되어 있지 않습니다.");
        }
    }

    private String buildNetworkErrorMessage(ResourceAccessException e) {
        if (e.getCause() instanceof SocketTimeoutException) {
            return "TourAPI 관광지 검색 API 요청 시간이 초과되었습니다.";
        }

        return "TourAPI 관광지 검색 API에 연결할 수 없습니다.";
    }

    private record TourApiHttpResponse(
            HttpStatusCode statusCode,
            String body
    ) {
    }
}
