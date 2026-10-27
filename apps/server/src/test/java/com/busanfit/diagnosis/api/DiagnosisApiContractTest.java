package com.busanfit.diagnosis.api;

import static com.busanfit.diagnosis.domain.DiagnosisFixtures.COORDINATE;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.known;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.unknown;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.busanfit.diagnosis.application.port.TourismPort;
import com.busanfit.diagnosis.domain.DiagnosisContext;
import com.busanfit.global.external.tmap.TmapApiException;
import com.busanfit.global.external.tmap.TmapClient;
import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import com.busanfit.global.external.tmap.dto.TmapRouteCoordinate;
import com.busanfit.global.security.JwtProvider;
import com.busanfit.user.User;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class DiagnosisApiContractTest {
    @Autowired private MockMvc mvc;
    @Autowired private JwtProvider jwt;
    @MockitoBean private TourismPort tourism;
    @MockitoBean private TmapClient tmap;
    private String token;

    @BeforeEach
    void setUp() {
        token = jwt.generateAccessToken(User.builder().id(11L).email("diagnosis-fixture@example.test").nickname("fixture").build());
        when(tourism.findPlace(anyString())).thenReturn(known(new DiagnosisContext.Place("관광지", COORDINATE, known("26"))));
        when(tmap.getCarRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(
                new TmapCarRouteResult(61, 2, 100, List.of(new TmapRouteCoordinate(35, 129)), "secret raw response"));
    }

    @Test
    void authenticationMatchesExistingDiagnosisEndpoint() throws Exception {
        mvc.perform(post("/api/v2/planner/diagnose").contentType(MediaType.APPLICATION_JSON).content(request()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(tourism, tmap);
    }

    @Test
    void searchIdFinalStayCustomActivitiesAndRouteSnapshotSurviveApi() throws Exception {
        String result = diagnose(request()).andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("POSSIBLE"))
                .andExpect(jsonPath("$.verificationStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.feasible").doesNotExist())
                .andExpect(jsonPath("$.schedule.totalStaySeconds").value(6000))
                .andExpect(jsonPath("$.schedule.totalTravelSeconds").value(61))
                .andExpect(jsonPath("$.schedule.requiredSeconds").value(6061))
                .andExpect(jsonPath("$.schedule.stops[0].activitySeconds").value(8400))
                .andExpect(jsonPath("$.schedule.stops[0].placeId").value("tourapi-1997221"))
                .andExpect(jsonPath("$.schedule.stops[0].departure").value("2026-10-26T10:41:01+09:00"))
                .andExpect(jsonPath("$.schedule.segments[0].route.value.seconds").value(61))
                .andExpect(jsonPath("$.schedule.segments[0].route.value.coordinates[0].latitude").value(35))
                .andReturn().getResponse().getContentAsString();
        assertThat(result).doesNotContain("secret raw response", "rawResponse", "estimatedStayMinutes");
    }

    @Test
    void travelFailureProducesUndeterminedWhileKnownOverrunStillWins() throws Exception {
        when(tmap.getCarRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenThrow(new TmapApiException("secret"));
        diagnose(request()).andExpect(status().isOk()).andExpect(jsonPath("$.decision").value("UNDETERMINED"))
                .andExpect(jsonPath("$.verificationStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.schedule.calculationComplete").value(false))
                .andExpect(jsonPath("$.schedule.requiredSeconds").isEmpty());
        diagnose(request().replace("6000", "18000")).andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("ADJUSTMENT_REQUIRED"))
                .andExpect(jsonPath("$.schedule.remainingSeconds").isEmpty());
    }

    @Test
    void knownElapsedTimeAndRemainingStayProveOverrunWhileExactTotalsRemainUnknown() throws Exception {
        when(tmap.getCarRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new TmapCarRouteResult(9000, 150, 100,
                        List.of(new TmapRouteCoordinate(35, 129)), "raw"))
                .thenThrow(new TmapApiException("second route unavailable"));
        diagnose("""
                {"travelDate":"2026-10-26","startTime":"09:00","endTime":"12:00",
                 "timeZone":"Asia/Seoul","transportMode":"CAR",
                 "departure":{"name":"부산역","latitude":35.1151,"longitude":129.0414},
                 "stops":[{"placeId":"tourapi-1","plannedStaySeconds":1800,"activities":[]},
                          {"placeId":"tourapi-2","plannedStaySeconds":1800,"activities":[]}]}
                """).andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("ADJUSTMENT_REQUIRED"))
                .andExpect(jsonPath("$.verificationStatus").value("PARTIAL"))
                .andExpect(jsonPath("$.schedule.calculationComplete").value(false))
                .andExpect(jsonPath("$.schedule.requiredSeconds").isEmpty())
                .andExpect(jsonPath("$.schedule.remainingSeconds").isEmpty())
                .andExpect(jsonPath("$.schedule.stops[0].departure").value("2026-10-26T12:00:00+09:00"))
                .andExpect(jsonPath("$.schedule.stops[1].departure").isEmpty());
    }

    @Test
    void placeLookupFailureIsNotInvalidInputOrSafeAndSkipsUnknownCoordinates() throws Exception {
        when(tourism.findPlace(anyString())).thenReturn(unknown("장소 확인 중 외부 장애"));
        diagnose(request()).andExpect(status().isOk()).andExpect(jsonPath("$.decision").value("UNDETERMINED"))
                .andExpect(jsonPath("$.verificationStatus").value("UNKNOWN"));
        verifyNoInteractions(tmap);
    }

    @Test
    void confirmedMissingPlaceIs400BeforeRouteCalls() throws Exception {
        when(tourism.findPlace(anyString())).thenThrow(new IllegalArgumentException("존재하지 않는 관광지 ID입니다."));
        diagnose(request()).andExpect(status().isBadRequest());
        verifyNoInteractions(tmap);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.5", "\"6000\"", "null", "9223372036854775808"})
    void invalidOrCoercedStayIsRejectedBeforeExternalCalls(String seconds) throws Exception {
        diagnose(request().replace("6000", seconds)).andExpect(status().isBadRequest());
        verifyNoInteractions(tourism, tmap);
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-02-30", "2026-1-01", "0000-01-01"})
    void invalidDateIs400BeforeExternalCalls(String date) throws Exception {
        diagnose(request().replace("2026-10-26", date)).andExpect(status().isBadRequest());
        verifyNoInteractions(tourism, tmap);
    }

    @Test
    void malformedRequestAndInvalidActivityNeverCallProviders() throws Exception {
        List<String> invalid = List.of("{}", request().replace("09:00", "9:00"),
                request().replace("Asia/Seoul", "UTC"), request().replace("CAR", "WALK"),
                request().replace("tourapi-1997221", "place-haeundae-beach"), request().replace("35.1151", "91"),
                request().replace("\"photo\"", "\"unsupported\""),
                request().replace("\"durationSeconds\":4500", "\"durationSeconds\":0"),
                request().replace("{\"code\":\"rest\",\"durationSeconds\":2700}", "{\"code\":\"rest\"}"),
                request().replace("{\"code\":\"photo\"}", "{\"code\":\"photo\",\"durationSeconds\":60}"),
                request().replace("{\"code\":\"photo\"}", "{\"code\":\"rest\",\"durationSeconds\":60}"));
        for (String body : invalid) {
            clearInvocations(tourism, tmap);
            diagnose(body).andExpect(status().isBadRequest());
            verifyNoInteractions(tourism, tmap);
        }
    }

    private ResultActions diagnose(String body) throws Exception {
        return mvc.perform(post("/api/v2/planner/diagnose").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String request() {
        return """
                {"travelDate":"2026-10-26","startTime":"09:00","endTime":"13:00",
                 "timeZone":"Asia/Seoul","transportMode":"CAR",
                 "departure":{"name":"부산역","latitude":35.1151,"longitude":129.0414},
                 "stops":[{"placeId":"tourapi-1997221","plannedStaySeconds":6000,
                 "activities":[{"code":"photo"},{"code":"rest","durationSeconds":2700},{"code":"other","durationSeconds":4500}]}]}
                """;
    }
}
