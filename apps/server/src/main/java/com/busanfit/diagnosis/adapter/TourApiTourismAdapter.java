package com.busanfit.diagnosis.adapter;

import com.busanfit.diagnosis.application.port.TourismPort;
import com.busanfit.diagnosis.domain.DiagnosisContext.Coordinate;
import com.busanfit.diagnosis.domain.DiagnosisContext.Place;
import com.busanfit.diagnosis.domain.Evidence;
import com.busanfit.global.external.tourapi.TourApiException;
import com.busanfit.global.external.tourapi.TourApiProperties;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class TourApiTourismAdapter implements TourismPort {
    private final RestClient client;
    private final TourApiProperties properties;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    public TourApiTourismAdapter(RestClient tourApiRestClient, TourApiProperties properties, Clock diagnosisClock) {
        this.client = tourApiRestClient;
        this.properties = properties;
        this.clock = diagnosisClock;
    }

    @Override
    public Evidence<Place> findPlace(String placeId) {
        if (placeId == null || !placeId.matches("tourapi-[0-9]+")) {
            throw new IllegalArgumentException("관광지 ID 형식이 올바르지 않습니다.");
        }
        String contentId = placeId.substring("tourapi-".length());
        if (properties.serviceKey() == null || properties.serviceKey().isBlank()) {
            return unavailable("TourAPI 인증 설정이 없어 장소 정보를 확인하지 못했습니다.");
        }
        JsonNode body;
        try {
            body = client.get().uri(builder -> builder.path("/detailCommon2")
                    .queryParam("serviceKey", "{key}").queryParam("MobileOS", "ETC")
                    .queryParam("MobileApp", "BusanFit").queryParam("_type", "json")
                    .queryParam("contentId", "{contentId}")
                    .build(Map.of("key", properties.serviceKey(), "contentId", contentId)))
                    .exchange((request, response) -> {
                        if (response.getStatusCode().isError()) {
                            throw new TourApiException("장소 조회 실패");
                        }
                        return mapper.readTree(new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8));
                    });
            if (body == null || !"0000".equals(body.path("response").path("header").path("resultCode").asText())) {
                return unavailable("TourAPI 장소 조회 성공을 확인하지 못했습니다.");
            }
            body = body.path("response").path("body");
        } catch (RestClientException | TourApiException | tools.jackson.core.JacksonException e) {
            return unavailable("TourAPI 장소 조회 중 통신·응답 오류가 발생했습니다.");
        }
        String count = body.path("totalCount").asText();
        var items = body.path("items");
        var item = items.path("item");
        boolean empty = items.isString() && items.asText().isBlank()
                || items.isObject() && (item.isMissingNode() || item.isNull() || item.isArray() && item.isEmpty());
        if ("0".equals(count) && empty) {
            throw new IllegalArgumentException("존재하지 않는 관광지 ID입니다.");
        }
        if (!"1".equals(count) || item.isArray() && item.size() != 1) {
            return unavailable("TourAPI 장소 조회 응답 구조를 확인하지 못했습니다.");
        }
        if (item.isArray()) {
            item = item.get(0);
        }
        if (!item.isObject() || !contentId.equals(item.path("contentid").asText())
                || item.path("title").asText().isBlank()) {
            return unavailable("조회한 관광지의 ID·이름을 확인하지 못했습니다.");
        }
        try {
            var coordinate = new Coordinate(Double.parseDouble(item.path("mapy").asText()),
                    Double.parseDouble(item.path("mapx").asText()));
            var checkedAt = OffsetDateTime.now(clock);
            String regionCode = item.path("lDongRegnCd").asText();
            Evidence<String> region = regionCode.matches("[0-9]{2}")
                    ? Evidence.known(regionCode, "TourAPI", checkedAt)
                    : Evidence.unavailable("TourAPI", checkedAt, "법정동 시도코드를 확인하지 못했습니다.");
            return Evidence.known(new Place(item.path("title").asText(), coordinate, region), "TourAPI", checkedAt);
        } catch (IllegalArgumentException e) {
            return unavailable("관광지의 유효한 좌표를 확인하지 못했습니다.");
        }
    }

    private Evidence<Place> unavailable(String reason) {
        return Evidence.unavailable("TourAPI", OffsetDateTime.now(clock), reason);
    }
}
