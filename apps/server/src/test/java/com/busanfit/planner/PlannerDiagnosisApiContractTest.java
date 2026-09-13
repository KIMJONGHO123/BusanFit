package com.busanfit.planner;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.busanfit.global.external.tmap.TmapClient;
import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import com.busanfit.global.external.tmap.dto.TmapRouteCoordinate;
import com.busanfit.user.JsonTestUtils;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlannerDiagnosisApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TmapClient tmapClient;

    @BeforeEach
    void setUp() {
        when(tmapClient.getCarRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new TmapCarRouteResult(
                        1800,
                        30,
                        10000,
                        List.of(
                                new TmapRouteCoordinate(35.1151, 129.0414),
                                new TmapRouteCoordinate(35.1587, 129.1604)
                        ),
                        "{}"
                ));
    }

    @Test
    void diagnoseRequiresLoginToken() throws Exception {
        mockMvc.perform(post("/api/planner/diagnose")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validDiagnoseRequest()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void diagnoseReturnsScheduleTimelineForAuthenticatedUser() throws Exception {
        String accessToken = signupAndLogin();

        mockMvc.perform(post("/api/planner/diagnose")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validDiagnoseRequest()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.diagnosisId").value(not(blankOrNullString())))
                .andExpect(jsonPath("$.status").value("WARNING"))
                .andExpect(jsonPath("$.feasible").value(true))
                .andExpect(jsonPath("$.startTime").value("10:00"))
                .andExpect(jsonPath("$.expectedEndTime").value(not(blankOrNullString())))
                .andExpect(jsonPath("$.availableMinutes").value(240))
                .andExpect(jsonPath("$.requiredMinutes").value(greaterThan(140)))
                .andExpect(jsonPath("$.totalStayMinutes").value(140))
                .andExpect(jsonPath("$.totalTravelMinutes").value(greaterThan(0)))
                .andExpect(jsonPath("$.stops[0].placeId").value("place-haeundae-beach"))
                .andExpect(jsonPath("$.stops[0].placeName").value("해운대해수욕장"))
                .andExpect(jsonPath("$.stops[0].order").value(1))
                .andExpect(jsonPath("$.stops[0].arrivalTime").value(not("10:00")))
                .andExpect(jsonPath("$.stops[0].baseStayMinutes").value(90))
                .andExpect(jsonPath("$.stops[0].activityMinutes").value(50))
                .andExpect(jsonPath("$.stops[0].stayMinutes").value(140))
                .andExpect(jsonPath("$.stops[0].travelMinutesFromPrevious").value(greaterThan(0)))
                .andExpect(jsonPath("$.stops[0].travelDistanceMetersFromPrevious").value(10000))
                .andExpect(jsonPath("$.stops[0].routeCoordinatesFromPrevious[0].latitude").value(35.1151))
                .andExpect(jsonPath("$.stops[0].routeCoordinatesFromPrevious[1].longitude").value(129.1604))
                .andExpect(jsonPath("$.stops[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$.warnings[0]").value("해운대해수욕장은 야외 장소이며 선택한 활동이 날씨 영향을 받을 수 있습니다."));
    }

    private String signupAndLogin() throws Exception {
        mockMvc.perform(post("/api/user/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "planner-user@example.com",
                                  "password": "password123!",
                                  "nickname": "plannerUser"
                                }
                                """))
                .andExpect(status().isOk());

        MvcResult loginResult = mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "planner-user@example.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        return JsonTestUtils.readString(loginResult.getResponse().getContentAsString(), "accessToken");
    }

    private String validDiagnoseRequest() {
        return """
                {
                  "date": "2026-09-10",
                  "startTime": "10:00",
                  "endTime": "14:00",
                  "startLocation": {
                    "name": "부산역",
                    "latitude": 35.1151,
                    "longitude": 129.0414
                  },
                  "places": [
                    {
                      "placeId": "place-haeundae-beach",
                      "activities": ["photo", "walk"]
                    }
                  ]
                }
                """;
    }
}
