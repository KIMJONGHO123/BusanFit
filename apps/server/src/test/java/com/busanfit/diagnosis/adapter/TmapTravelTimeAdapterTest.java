package com.busanfit.diagnosis.adapter;

import static com.busanfit.diagnosis.domain.DiagnosisFixtures.CLOCK;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.COORDINATE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.busanfit.global.external.tmap.TmapApiException;
import com.busanfit.global.external.tmap.TmapClient;
import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import com.busanfit.global.external.tmap.dto.TmapRouteCoordinate;
import java.util.List;
import org.junit.jupiter.api.Test;

class TmapTravelTimeAdapterTest {
    @Test
    void secondsAndSnapshotAreCopiedWithoutProviderRawResponse() {
        var client = mock(TmapClient.class);
        when(client.getCarRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new TmapCarRouteResult(61, 2, 100, List.of(new TmapRouteCoordinate(35, 129)), "secret raw"));
        var result = new TmapTravelTimeAdapter(client, CLOCK).findRoute(COORDINATE, COORDINATE);
        assertThat(result.value().seconds()).isEqualTo(61);
        assertThat(result.value().coordinates()).containsExactly(COORDINATE);
        assertThat(result.toString()).doesNotContain("secret raw");
    }

    @Test
    void eval322CommunicationFailureAndEmptyPathAreUnverifiable() {
        var client = mock(TmapClient.class);
        when(client.getCarRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenThrow(new TmapApiException("secret provider request"))
                .thenReturn(new TmapCarRouteResult(0, 0, 0, List.of(), "raw"))
                .thenReturn(new TmapCarRouteResult(-1, 0, 100, List.of(new TmapRouteCoordinate(35, 129)), "raw"))
                .thenReturn(new TmapCarRouteResult(60, 1, 100, List.of(new TmapRouteCoordinate(91, 129)), "raw"));
        var adapter = new TmapTravelTimeAdapter(client, CLOCK);
        for (int i = 0; i < 4; i++) {
            var result = adapter.findRoute(COORDINATE, COORDINATE);
            assertThat(result.confirmed()).isFalse();
            assertThat(result.value()).isNull();
            assertThat(result.limitation()).doesNotContain("secret", "raw");
        }
    }
}
