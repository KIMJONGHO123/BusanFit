package com.busanfit.diagnosis;

import static org.assertj.core.api.Assertions.assertThat;

import com.busanfit.global.external.tourapi.TourApiClient;
import com.busanfit.global.security.JwtProvider;
import com.busanfit.user.User;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

/** Opt-in: real TourAPI search/detail and real TMAP, with an isolated H2 application context. */
@EnabledIfEnvironmentVariable(named = "BUSANFIT_LIVE_DIAGNOSIS", matches = "1")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.config.import=optional:file:src/main/resources/application-env.yaml",
        "external.public-data.service-key=${PUBLIC_DATA_SERVICE_KEY:}",
        "external.public-data.base-url=${PUBLIC_DATA_BASE_URL:https://apis.data.go.kr/B551011/KorService2}",
        "external.tmap.app-key=${TMAP_APP_KEY:}",
        "external.tmap.base-url=${TMAP_BASE_URL:https://apis.openapi.sk.com/tmap}",
        "external.tmap.timeout=10s"
})
class DiagnosisLiveTest {
    @LocalServerPort private int port;
    @Autowired private TourApiClient tourApi;
    @Autowired private JwtProvider jwt;

    @Test
    void realSearchPlaceAndRealRouteProducePartialDiagnosisAndConfirmedOverrun() throws Exception {
        var places = tourApi.searchPlaces("감천문화마을", 1, 1);
        assertThat(places).isNotEmpty();
        String placeId = places.getFirst().id();
        String token = jwt.generateAccessToken(User.builder().id(901L)
                .email("diagnosis-live@example.test").nickname("live-test").build());
        String request = """
                {"travelDate":"%s","startTime":"09:00","endTime":"18:00",
                 "timeZone":"Asia/Seoul","transportMode":"CAR",
                 "departure":{"name":"부산역","latitude":35.1151,"longitude":129.0414},
                 "stops":[{"placeId":"%s","plannedStaySeconds":3600,"activities":[]}]}
                """.formatted(LocalDate.now().plusDays(1), placeId);
        var client = RestClient.builder().baseUrl("http://localhost:" + port).build();
        String json = client.post().uri("/api/v2/planner/diagnose").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).body(request).retrieve().body(String.class);
        var result = new ObjectMapper().readTree(json);
        assertThat(result.path("decision").asText()).isIn("POSSIBLE", "CAUTION");
        assertThat(result.path("verificationStatus").asText()).isEqualTo("PARTIAL");
        var schedule = result.path("schedule");
        assertThat(schedule.path("calculationComplete").asBoolean()).isTrue();
        long seconds = schedule.path("totalTravelSeconds").asLong();
        assertThat(seconds).isPositive();
        assertThat(schedule.path("requiredSeconds").asLong()).isEqualTo(3600 + seconds);
        assertThat(schedule.path("stops").get(0).path("placeId").asText()).isEqualTo(placeId);
        var route = schedule.path("segments").get(0).path("route");
        assertThat(route.path("source").asText()).isEqualTo("TMAP");
        assertThat(route.path("value").path("seconds").asLong()).isEqualTo(seconds);
        assertThat(route.path("value").path("coordinates").isEmpty()).isFalse();
        assertThat(json).doesNotContain("rawResponse", "serviceKey", "appKey");

        String overrun = client.post().uri("/api/v2/planner/diagnose").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).body(request.replace("3600", "36000"))
                .retrieve().body(String.class);
        var overrunResult = new ObjectMapper().readTree(overrun);
        assertThat(overrunResult.path("decision").asText()).isEqualTo("ADJUSTMENT_REQUIRED");
        assertThat(overrunResult.path("verificationStatus").asText()).isEqualTo("PARTIAL");
        System.out.printf("TASK-011 live: searchId=%s, decision=%s, verification=PARTIAL, travelSeconds=%d, overrun=%s%n",
                placeId, result.path("decision").asText(), seconds, overrunResult.path("decision").asText());
    }
}
