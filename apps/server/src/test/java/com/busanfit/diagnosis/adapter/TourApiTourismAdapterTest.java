package com.busanfit.diagnosis.adapter;

import static com.busanfit.diagnosis.domain.DiagnosisFixtures.CLOCK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadGateway;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.busanfit.global.external.tourapi.TourApiProperties;
import java.net.SocketTimeoutException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TourApiTourismAdapterTest {
    private MockRestServiceServer server;
    private TourApiTourismAdapter adapter;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder().baseUrl("https://example.test/KorService2");
        server = MockRestServiceServer.bindTo(builder).build();
        adapter = new TourApiTourismAdapter(builder.build(), new TourApiProperties("test+key/=", null, null, null, null), CLOCK);
    }

    @Test
    void lookupUsesSearchIdentityAndVerifiedCoordinatesAndLegalRegion() {
        server.expect(request -> {
            assertThat(request.getURI().getPath()).isEqualTo("/KorService2/detailCommon2");
            assertThat(Arrays.stream(request.getURI().getRawQuery().split("&"))
                    .map(p -> URLDecoder.decode(p, StandardCharsets.UTF_8)))
                    .contains("contentId=1997221", "serviceKey=test+key/=")
                    .noneMatch(p -> p.startsWith("areaCode="));
        }).andRespond(withSuccess(envelope("""
                {"item":[{"contentid":"1997221","title":"부산 감천문화마을","mapx":"129.0106","mapy":"35.0975",
                "lDongRegnCd":"26","areacode":""}]}
                """, "1"), MediaType.APPLICATION_JSON));
        var evidence = adapter.findPlace("tourapi-1997221");
        assertThat(evidence.confirmed()).isTrue();
        assertThat(evidence.value().name()).isEqualTo("부산 감천문화마을");
        assertThat(evidence.value().coordinate().latitude()).isEqualTo(35.0975);
        assertThat(evidence.value().region().value()).isEqualTo("26");
        server.verify();
    }

    @Test
    void coordinatesCanBeKnownWhileRegionIsUnknownWithoutInferringFromName() {
        respond(envelope("{\"item\":{\"contentid\":\"1\",\"title\":\"부산이라는 이름\",\"mapx\":\"129\",\"mapy\":\"35\"}}", "1"));
        var evidence = adapter.findPlace("tourapi-1");
        assertThat(evidence.confirmed()).isTrue();
        assertThat(evidence.value().region().confirmed()).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"\"", "{}", "{\"item\":[]}", "{\"item\":null}"})
    void onlyConfirmedNotFoundIsInputError(String items) {
        respond(envelope(items, "0"));
        assertThatThrownBy(() -> adapter.findPlace("tourapi-1")).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "null", "not json", "<error>secret</error>",
            "{\"response\":{\"header\":{\"resultCode\":\"30\",\"resultMsg\":\"secret\"}}}",
            "{\"response\":{\"header\":{\"resultCode\":\"0000\"}}}"})
    void malformedOrFailedLookupRemainsUnknown(String body) {
        respond(body);
        var result = adapter.findPlace("tourapi-1");
        assertThat(result.confirmed()).isFalse();
        assertThat(result.limitation()).doesNotContain("secret");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"item\":{\"contentid\":\"2\",\"title\":\"장소\",\"mapx\":\"129\",\"mapy\":\"35\"}}",
            "{\"item\":{\"contentid\":\"1\",\"title\":\"장소\",\"mapx\":\"129\",\"mapy\":\"NaN\"}}",
            "{\"item\":{\"contentid\":\"1\",\"title\":\"장소\",\"mapx\":\"181\",\"mapy\":\"35\"}}",
            "{\"item\":{\"contentid\":\"1\",\"title\":\"장소\"}}", "\"\"", "{\"item\":[]}",
            "{\"item\":[{},{}]}"})
    void wrongIdentityOrUnusablePlaceNeverBecomesConfirmed(String items) {
        respond(envelope(items, "1"));
        assertThat(adapter.findPlace("tourapi-1").confirmed()).isFalse();
    }

    @Test
    void httpFailureAndTimeoutDoNotExposeProviderMessage() {
        server.expect(request -> { }).andRespond(withBadGateway().body("secret request URL"));
        assertThat(adapter.findPlace("tourapi-1").limitation()).doesNotContain("secret");
        server.verify();
        server.reset();
        server.expect(request -> { }).andRespond(request -> { throw new SocketTimeoutException("secret request URL"); });
        assertThat(adapter.findPlace("tourapi-1").limitation()).doesNotContain("secret");
    }

    private void respond(String body) {
        server.expect(request -> { }).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private String envelope(String items, String count) {
        return "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"totalCount\":" + count
                + ",\"items\":" + items + "}}}";
    }
}
