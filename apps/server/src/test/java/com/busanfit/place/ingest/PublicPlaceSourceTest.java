package com.busanfit.place.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.busanfit.place.ingest.adapter.PublicPlaceSource;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PublicPlaceSourceTest {
    private HttpServer server;
    private PublicPlaceSource source;

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        source = new PublicPlaceSource(base, base, "test+key/=secret", "test+key/=secret",
                Clock.fixed(Instant.parse("2026-11-03T01:00:00Z"), ZoneOffset.UTC));
        server.start();
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void storesOnlySelectedFieldsAndDistinguishesMissingEmptyInvalidAndMeaningfulValues() {
        reply("/getAttractionKr", 200, busan("""
                [{"UC_SEQ":255,"MAIN_TITLE":"해운대해수욕장","GUGUN_NM":"해운대구","ADDR1":"부산 해운대구",
                "LAT":"NaN","LNG":129.1,"USAGE_AMOUNT":"무료","HLDY_INFO":"휴무 없음",
                "USAGE_DAY_WEEK_AND_TIME":"상시 개방","CNTCT_TEL":"  ","UNNECESSARY_RAW":"discard"}]
                """, 1, 1));
        var result = source.collect(PlaceSnapshot.Source.BUSAN);
        assertThat(result.places()).hasSize(1);
        var place = result.places().getFirst();
        assertThat(place.name()).isEqualTo("해운대해수욕장");
        assertThat(place.regionCode()).isEqualTo("26");
        assertThat(place.latitude()).isNull();
        assertThat(place.details()).containsEntry("feesText", "무료").containsEntry("closedDays", "휴무 없음")
                .containsEntry("hoursText", "상시 개방").doesNotContainKey("UNNECESSARY_RAW");
        assertThat(state(place, "latitude")).isEqualTo("INVALID");
        assertThat(state(place, "telephone")).isEqualTo("EMPTY");
        assertThat(state(place, "homepage")).isEqualTo("MISSING");
    }

    @Test
    void unknownDistrictIsNotAssumedToBeBusan() {
        reply("/getAttractionKr", 200, busan("[{\"UC_SEQ\":1,\"MAIN_TITLE\":\"장소\",\"GUGUN_NM\":\"미확인\"}]", 1, 1));
        assertThat(source.collect(PlaceSnapshot.Source.BUSAN).places().getFirst().regionCode()).isNull();
    }

    @Test
    void missingDistrictIsStoredAsUnknownWithoutDiscardingTheSourceRecord() {
        reply("/getAttractionKr", 200, busan("[{\"UC_SEQ\":1,\"MAIN_TITLE\":\"장소\"}]", 1, 1));
        var place = source.collect(PlaceSnapshot.Source.BUSAN).places().getFirst();
        assertThat(place.regionCode()).isNull();
        assertThat(state(place, "district")).isEqualTo("MISSING");
    }

    @Test
    void pageFailurePreventsIncompleteCollection() {
        var hits = new AtomicInteger();
        server.createContext("/getAttractionKr", exchange -> {
            int hit = hits.incrementAndGet();
            String response = hit == 1 ? busan(hundredItems(), 101, 1) : "failure containing test+key/=secret";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(hit == 1 ? 200 : 503, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        assertThatThrownBy(() -> source.collect(PlaceSnapshot.Source.BUSAN))
                .isInstanceOf(IllegalStateException.class).hasMessageNotContaining("test+key");
        assertThat(hits).hasValue(2);
    }

    @Test
    void duplicateAcrossPagesCannotCountAsCompleteCollection() {
        var hits = new AtomicInteger();
        server.createContext("/getAttractionKr", exchange -> {
            int page = hits.incrementAndGet();
            byte[] bytes = busan(page == 1 ? hundredItems() : "[{\"UC_SEQ\":1}]", 101, page)
                    .getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        assertThatThrownBy(() -> source.collect(PlaceSnapshot.Source.BUSAN))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("DUPLICATE");
    }

    @Test
    void normalEmptyResultAndMalformedResultRemainDifferent() {
        reply("/getAttractionKr", 200, busan("[]", 0, 1));
        assertThat(source.collect(PlaceSnapshot.Source.BUSAN).places()).isEmpty();
        server.removeContext("/getAttractionKr");
        reply("/getAttractionKr", 200, "{\"getAttractionKr\":{\"header\":{\"code\":\"00\"}}}");
        assertThatThrownBy(() -> source.collect(PlaceSnapshot.Source.BUSAN)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tourCommonIntroAndAdditionalInformationAreAssociatedByVerifiedId() {
        reply("/areaBasedList2", 200, tour("[{\"contentid\":\"10\",\"contenttypeid\":\"12\",\"lDongRegnCd\":\"26\"}]", 1));
        reply("/detailCommon2", 200, tour("""
                [{"contentid":"10","contenttypeid":"12","lDongRegnCd":"26","title":"관광지",
                "addr1":"부산 중구","mapy":"35.1","mapx":"129.1","overview":"소개","tel":"051-000-0000"}]
                """, 1));
        reply("/detailIntro2", 200, tour("[{\"contentid\":\"10\",\"usetime\":\"09:00~18:00\",\"restdate\":\"휴무 없음\"}]", 1));
        reply("/detailInfo2", 200, tour("[{\"contentid\":\"10\",\"serialnum\":\"0\",\"infoname\":\"입장료\",\"infotext\":\"무료\"}]", 1));
        var place = source.collect(PlaceSnapshot.Source.TOURAPI).places().getFirst();
        assertThat(place.externalId()).isEqualTo("10");
        assertThat(place.details()).containsEntry("description", "소개").containsEntry("hoursText", "09:00~18:00");
        assertThat(place.details().get("additionalInformation").toString()).contains("입장료", "무료");
    }

    @Test
    void confirmedEmptyTourDetailIsRecordedAsEmpty() {
        reply("/areaBasedList2", 200, tour("[{\"contentid\":\"10\",\"contenttypeid\":\"12\",\"lDongRegnCd\":\"26\"}]", 1));
        reply("/detailCommon2", 200, tour("[{\"contentid\":\"10\",\"contenttypeid\":\"12\",\"lDongRegnCd\":\"26\"}]", 1));
        String empty = """
                {"response":{"header":{"resultCode":"0000"},"body":{"items":"","numOfRows":0,"pageNo":1,"totalCount":0}}}
                """;
        reply("/detailIntro2", 200, empty);
        reply("/detailInfo2", 200, empty);
        var place = source.collect(PlaceSnapshot.Source.TOURAPI).places().getFirst();
        assertThat(place.details()).containsEntry("additionalInformation", java.util.List.of());
        assertThat(state(place, "additionalInformation")).isEqualTo("EMPTY");
    }

    @Test
    void unexpectedTourRegionPreventsCollection() {
        reply("/areaBasedList2", 200, tour("[{\"contentid\":\"10\",\"contenttypeid\":\"12\",\"lDongRegnCd\":\"11\"}]", 1));
        assertThatThrownBy(() -> source.collect(PlaceSnapshot.Source.TOURAPI)).hasMessageContaining("SCOPE");
    }

    private String state(PlaceSnapshot place, String key) {
        return String.valueOf(((Map<?, ?>) place.fieldStatus().get(key)).get("state"));
    }

    private String hundredItems() {
        return java.util.stream.IntStream.rangeClosed(1, 100).mapToObj(id -> "{\"UC_SEQ\":" + id + "}")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
    }

    private String busan(String items, int count, int page) {
        return "{\"getAttractionKr\":{\"header\":{\"code\":\"00\"},\"totalCount\":" + count
                + ",\"pageNo\":" + page + ",\"item\":" + items + "}}";
    }

    private String tour(String items, int count) {
        return "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"totalCount\":" + count
                + ",\"pageNo\":1,\"items\":{\"item\":" + items + "}}}}";
    }

    private void reply(String path, int status, String body) {
        server.createContext(path, exchange -> {
            if (!exchange.getRequestURI().getRawQuery().contains("serviceKey=test%2Bkey%2F%3Dsecret")) {
                exchange.sendResponseHeaders(400, -1);
                exchange.close();
                return;
            }
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json;charset=UTF-8");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
    }
}
