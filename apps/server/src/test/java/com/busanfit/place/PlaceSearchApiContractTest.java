package com.busanfit.place;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.busanfit.global.external.tourapi.TourApiClient;
import com.busanfit.global.external.tourapi.TourApiException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PlaceSearchApiContractTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TourApiClient tourApiClient;

    @Test
    void anonymousSearchPreservesTourApiIdentityAndCoordinates() throws Exception {
        when(tourApiClient.searchPlaces("해운대", 1, 20)).thenReturn(List.of(
                new PlaceSearchResult("tourapi-126081", "해운대해수욕장", "부산", "관광지",
                        35.1587, 129.1604, null, 90)));
        mvc.perform(get("/api/places/search").param("keyword", "해운대"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("tourapi-126081"))
                .andExpect(jsonPath("$[0].name").value("해운대해수욕장"))
                .andExpect(jsonPath("$[0].latitude").value(35.1587))
                .andExpect(jsonPath("$[0].longitude").value(129.1604));
    }

    @Test
    void upstreamFailureReturns502RatherThanSuccessfulEmptyList() throws Exception {
        when(tourApiClient.searchPlaces("", 1, 20)).thenThrow(new TourApiException("관광지 검색 실패"));
        mvc.perform(get("/api/places/search"))
                .andExpect(status().isBadGateway())
                .andExpect(content().string("관광지 검색 실패"));
    }

    @Test
    void confirmedEmptyResultReturnsSuccessfulEmptyArray() throws Exception {
        when(tourApiClient.searchPlaces("", 1, 20)).thenReturn(List.of());
        mvc.perform(get("/api/places/search"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
}
