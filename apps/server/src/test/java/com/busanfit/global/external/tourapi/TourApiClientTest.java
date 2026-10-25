package com.busanfit.global.external.tourapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadGateway;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.SocketTimeoutException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TourApiClientTest {
    private MockRestServiceServer server;
    private TourApiClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new TourApiClient(builder.baseUrl("https://apis.data.go.kr/B551011/KorService2").build(),
                new TourApiProperties("test+key/with=padding", null, null, null, Duration.ofSeconds(5)));
    }

    @Test
    void keywordSearchEncodesValuesAndMapsUtf8WithoutInventingPlaceInformation() {
        server.expect(request -> {
            assertThat(request.getURI().getPath()).isEqualTo("/B551011/KorService2/searchKeyword2");
            var query = Arrays.stream(request.getURI().getRawQuery().split("&"))
                    .map(part -> URLDecoder.decode(part, StandardCharsets.UTF_8)).toList();
            assertThat(query).contains("keyword=해운대 & 바다+산책", "serviceKey=test+key/with=padding",
                    "lDongRegnCd=26", "contentTypeId=12", "pageNo=1", "numOfRows=30");
            assertThat(query).noneMatch(part -> part.startsWith("areaCode=") || part.startsWith("sigunguCode="));
        }).andRespond(withSuccess(envelope("""
                {"item":[{"contentid":"126081","title":"해운대해수욕장","addr1":"부산광역시 해운대구",
                "mapy":"35.1587","mapx":"129.1604","firstimage2":"https://example.com/beach.jpg"}]}
                """, 1), MediaType.APPLICATION_JSON));

        var places = client.searchPlaces("  해운대 & 바다+산책  ", -1, 99);

        assertThat(places).hasSize(1);
        var place = places.getFirst();
        assertThat(place.id()).isEqualTo("tourapi-126081");
        assertThat(place.name()).isEqualTo("해운대해수욕장");
        assertThat(place.address()).isEqualTo("부산광역시 해운대구");
        assertThat(place.latitude()).isEqualTo(35.1587);
        assertThat(place.longitude()).isEqualTo(129.1604);
        assertThat(place.imageUrl()).isEqualTo("https://example.com/beach.jpg");
        server.verify();
    }

    @Test
    void blankKeywordUsesAreaListAndAcceptsSingleItemWithoutPhoto() {
        server.expect(request -> {
            assertThat(request.getURI().getPath()).endsWith("/areaBasedList2");
            assertThat(request.getURI().getRawQuery()).doesNotContain("keyword=");
            assertThat(request.getURI().getRawQuery()).contains("lDongRegnCd=26")
                    .doesNotContain("areaCode=", "sigunguCode=");
        }).andRespond(withSuccess(envelope("""
                {"item":{"contentid":"1","title":"관광지","mapy":"35","mapx":"129"}}
                """, 1), MediaType.APPLICATION_JSON));
        assertThat(client.searchPlaces(" ", 1, 20)).singleElement().satisfies(place -> {
            assertThat(place.imageUrl()).isNull();
            assertThat(place.address()).isEmpty();
        });
        server.verify();
    }

    @Test
    void legalRegionSearchKeepsGamcheonEvenWhenDeprecatedAreaCodeIsEmpty() {
        server.expect(request -> {
            assertThat(request.getURI().getRawQuery()).contains("lDongRegnCd=26")
                    .doesNotContain("areaCode=");
        }).andRespond(withSuccess(envelope("""
                {"item":[{"contentid":"1997221","title":"부산 감천문화마을",
                  "addr1":"부산광역시 사하구 감내2로 203","areacode":"",
                  "lDongRegnCd":"26","lDongSignguCd":"380","mapy":"35.0975","mapx":"129.0106"}]}
                """, 1), MediaType.APPLICATION_JSON));

        assertThat(client.searchPlaces("감천문화마을", 1, 20)).singleElement().satisfies(place -> {
            assertThat(place.id()).isEqualTo("tourapi-1997221");
            assertThat(place.name()).isEqualTo("부산 감천문화마을");
        });
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"\"", "{}", "{\"item\":[]}", "{\"item\":null}"})
    void confirmedEmptyResultIsEmpty(String items) {
        respond(envelope(items, 0));
        assertThat(client.searchPlaces("없는장소", 1, 20)).isEmpty();
        server.verify();
    }

    @Test
    void emptyPageAfterLastPageDoesNotRequireTotalCountZero() {
        respond(envelope("\"\"", 20));
        assertThat(client.searchPlaces("", 100, 20)).isEmpty();
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}", "null", "not json", "<OpenAPI_ServiceResponse><returnAuthMsg>ERROR</returnAuthMsg></OpenAPI_ServiceResponse>",
            "{\"response\":{\"body\":{\"items\":\"\",\"totalCount\":0}}}",
            "{\"response\":{\"header\":{\"resultCode\":\"30\",\"resultMsg\":\"secret\"}}}",
            "{\"response\":{\"header\":{\"resultCode\":\"0000\"}}}",
            "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"items\":\"\"}}}"
    })
    void failedOrMalformedEnvelopeIsNeverEmptySearchSuccess(String body) {
        respond(body);
        assertThatThrownBy(() -> client.searchPlaces("해운대", 1, 20))
                .isInstanceOf(TourApiException.class).hasMessageNotContaining("secret");
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "[]", "42", "\"unexpected\"", "{}", "{\"item\":42}", "{\"item\":[42]}"})
    void malformedItemsAreNotNoResults(String items) {
        respond(envelope(items, 1));
        assertThatThrownBy(() -> client.searchPlaces("해운대", 1, 20)).isInstanceOf(TourApiException.class);
        server.verify();
    }

    @Test
    void missingIdentityAndInvalidCoordinatesAreFilteredWithoutFabricatingCoordinates() {
        respond(envelope("""
                {"item":[
                  {"contentid":"1","title":"정상","mapy":"35","mapx":"129"},
                  {"contentid":"2","title":"좌표없음"},
                  {"contentid":"3","title":"NaN","mapy":"NaN","mapx":"129"},
                  {"contentid":"4","title":"Infinity","mapy":"35","mapx":"Infinity"},
                  {"contentid":"5","title":"범위초과","mapy":"91","mapx":"129"},
                  {"contentid":"6","title":"범위초과","mapy":"35","mapx":"181"},
                  {"contentid":" ","title":"ID없음","mapy":"35","mapx":"129"}
                ]}
                """, 7));
        assertThat(client.searchPlaces("", 1, 20)).extracting("id").containsExactly("tourapi-1");
        server.verify();
    }

    @Test
    void httpFailureDoesNotExposeProviderBody() {
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/searchKeyword2")))
                .andRespond(withBadGateway().body("secret provider body"));
        assertThatThrownBy(() -> client.searchPlaces("해운대", 1, 20))
                .isInstanceOf(TourApiException.class).hasMessageContaining("502").hasMessageNotContaining("secret");
        server.verify();
    }

    @Test
    void timeoutIsFailureAndDoesNotExposeKeyInPublicMessage() {
        server.expect(request -> {}).andRespond(request -> { throw new SocketTimeoutException("secret request URL"); });
        assertThatThrownBy(() -> client.searchPlaces("해운대", 1, 20))
                .isInstanceOf(TourApiException.class).hasMessageContaining("시간이 초과").hasMessageNotContaining("secret");
        server.verify();
    }

    @Test
    void missingKeyFailsBeforeRequest() {
        var missingKeyClient = new TourApiClient(RestClient.create(), new TourApiProperties("", null, null, null, null));
        assertThatThrownBy(() -> missingKeyClient.searchPlaces("", 1, 20))
                .isInstanceOf(TourApiException.class).hasMessageContaining("PUBLIC_DATA_SERVICE_KEY");
    }

    private void respond(String body) {
        server.expect(request -> {}).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private String envelope(String items, int totalCount) {
        return "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"totalCount\":"
                + totalCount + ",\"items\":" + items + "}}}";
    }
}
