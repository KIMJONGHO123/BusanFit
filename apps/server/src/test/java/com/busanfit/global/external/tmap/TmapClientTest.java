package com.busanfit.global.external.tmap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TmapClientTest {

    private MockRestServiceServer mockServer;
    private TmapClient tmapClient;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder
                .baseUrl("https://apis.openapi.sk.com/tmap")
                .build();

        tmapClient = new TmapClient(
                restClient,
                new TmapProperties("test-app-key", "https://apis.openapi.sk.com/tmap", "/routes", Duration.ofSeconds(5))
        );
    }

    @Test
    void getCarRouteExtractsTotalTimeDistanceAndRouteCoordinates() {
        mockServer.expect(requestTo("https://apis.openapi.sk.com/tmap/routes?version=1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("appKey", "test-app-key"))
                .andRespond(withSuccess("""
                        {
                          "type": "FeatureCollection",
                          "features": [
                            {
                              "type": "Feature",
                              "geometry": {
                                "type": "Point",
                                "coordinates": [129.0106, 35.0975]
                              },
                              "properties": {
                                "totalDistance": 5200,
                                "totalTime": 1337
                              }
                            },
                            {
                              "type": "Feature",
                              "geometry": {
                                "type": "LineString",
                                "coordinates": [
                                  [129.1604, 35.1587],
                                  [129.1500, 35.1550],
                                  [129.1186, 35.1532]
                                ]
                              },
                              "properties": {
                                "distance": 5200,
                                "time": 1337
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        TmapCarRouteResult result = tmapClient.getCarRoute(
                35.1151,
                129.0414,
                35.0975,
                129.0106
        );

        assertThat(result.totalTimeSeconds()).isEqualTo(1337);
        assertThat(result.totalTimeMinutes()).isEqualTo(23);
        assertThat(result.totalDistanceMeters()).isEqualTo(5200);
        assertThat(result.coordinates())
                .extracting("latitude", "longitude")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(35.1587, 129.1604),
                        org.assertj.core.groups.Tuple.tuple(35.1550, 129.1500),
                        org.assertj.core.groups.Tuple.tuple(35.1532, 129.1186)
                );
        assertThat(result.rawResponse()).contains("\"type\": \"FeatureCollection\"");
    }

    @Test
    void getCarRouteMapsLongitudeToXAndLatitudeToY() {
        mockServer.expect(requestTo("https://apis.openapi.sk.com/tmap/routes?version=1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("\"startX\": 129.0414000")))
                .andExpect(content().string(containsString("\"startY\": 35.1151000")))
                .andExpect(content().string(containsString("\"endX\": 129.0106000")))
                .andExpect(content().string(containsString("\"endY\": 35.0975000")))
                .andExpect(content().string(containsString("\"reqCoordType\": \"WGS84GEO\"")))
                .andExpect(content().string(containsString("\"resCoordType\": \"WGS84GEO\"")))
                .andRespond(withSuccess("""
                        {
                          "features": [
                            {
                              "properties": {
                                "totalDistance": 100,
                                "totalTime": 60
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        tmapClient.getCarRoute(35.1151, 129.0414, 35.0975, 129.0106);
    }

    @Test
    void getCarRouteThrowsExceptionWhenSummaryFieldsAreMissing() {
        mockServer.expect(requestTo("https://apis.openapi.sk.com/tmap/routes?version=1"))
                .andRespond(withSuccess("""
                        {
                          "type": "FeatureCollection",
                          "features": [
                            {
                              "type": "Feature",
                              "properties": {
                                "description": "summary is missing"
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> tmapClient.getCarRoute(35.1151, 129.0414, 35.0975, 129.0106))
                .isInstanceOf(TmapApiException.class)
                .hasMessage("TMAP 응답에 총 이동시간 또는 총 이동거리 정보가 없습니다.");
    }

    @Test
    void getCarRouteThrowsExceptionWhenTmapReturnsErrorStatus() {
        mockServer.expect(requestTo("https://apis.openapi.sk.com/tmap/routes?version=1"))
                .andRespond(withBadRequest().body("""
                        {
                          "error": {
                            "message": "invalid request"
                          }
                        }
                        """));

        assertThatThrownBy(() -> tmapClient.getCarRoute(35.1151, 129.0414, 35.0975, 129.0106))
                .isInstanceOf(TmapApiException.class)
                .hasMessage("TMAP 자동차 경로안내 API 오류입니다. status=400");
    }

    @Test
    void getCarRouteRejectsInvalidCoordinate() {
        assertThatThrownBy(() -> tmapClient.getCarRoute(120.0, 129.0414, 35.0975, 129.0106))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("출발지 위도 값이 올바르지 않습니다.");
    }
}
