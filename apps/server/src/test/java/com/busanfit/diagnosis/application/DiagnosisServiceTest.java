package com.busanfit.diagnosis.application;

import static com.busanfit.diagnosis.domain.DiagnosisFixtures.CLOCK;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.COORDINATE;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.engine;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.known;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.unknown;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.busanfit.diagnosis.application.port.TourismPort;
import com.busanfit.diagnosis.application.port.TravelTimePort;
import com.busanfit.diagnosis.domain.DiagnosisContext;
import com.busanfit.diagnosis.domain.DiagnosisDecision;
import java.util.List;
import org.junit.jupiter.api.Test;

class DiagnosisServiceTest {
    private final TourismPort tourism = mock(TourismPort.class);
    private final TravelTimePort travel = mock(TravelTimePort.class);
    private final DiagnosisService service = new DiagnosisService(tourism, travel, engine(), CLOCK);

    @Test
    void laterRouteLookupContinuesAfterFirstRouteFailureWithoutFabricatingTimeline() {
        var destination = new DiagnosisContext.Coordinate(36, 129);
        when(tourism.findPlace("tourapi-1")).thenReturn(known(new DiagnosisContext.Place("A", COORDINATE, known("26"))));
        when(tourism.findPlace("tourapi-2")).thenReturn(known(new DiagnosisContext.Place("B", destination, known("11"))));
        when(travel.findRoute(any(), any())).thenReturn(unknown("TMAP 장애"))
                .thenReturn(known(new DiagnosisContext.Route(61, 100, List.of(COORDINATE, destination))));
        var result = service.diagnose(command(List.of(stop("tourapi-1"), stop("tourapi-2"))));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.UNDETERMINED);
        assertThat(result.schedule().segments().get(1).route().value().seconds()).isEqualTo(61);
        assertThat(result.schedule().stops().get(1).arrival()).isNull();
        verify(travel).findRoute(new DiagnosisContext.Coordinate(35.1151, 129.0414), COORDINATE);
        verify(travel).findRoute(COORDINATE, destination);
    }

    @Test
    void unknownPlaceDoesNotPreventOtherPlaceLookupsButBlocksOnlyItsAdjacentRoutes() {
        when(tourism.findPlace("tourapi-1")).thenReturn(unknown("외부 장애"));
        when(tourism.findPlace("tourapi-2")).thenReturn(known(new DiagnosisContext.Place("B", COORDINATE, known("26"))));
        when(tourism.findPlace("tourapi-3")).thenReturn(known(new DiagnosisContext.Place("C", COORDINATE, known("26"))));
        when(travel.findRoute(any(), any())).thenReturn(known(new DiagnosisContext.Route(61, 100, List.of(COORDINATE))));
        var result = service.diagnose(command(List.of(stop("tourapi-1"), stop("tourapi-2"), stop("tourapi-3"))));
        assertThat(result.schedule().segments().get(0).route().confirmed()).isFalse();
        assertThat(result.schedule().segments().get(1).route().confirmed()).isFalse();
        assertThat(result.schedule().segments().get(2).route().confirmed()).isTrue();
        verify(travel, times(1)).findRoute(COORDINATE, COORDINATE);
    }

    @Test
    void wholeRequestIsValidatedBeforeFirstPlaceLookup() {
        assertThatThrownBy(() -> service.diagnose(command(List.of(stop("tourapi-1"), stop("invalid")))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.diagnose(command(List.of(stop("tourapi-1"), stop("tourapi-1")))))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(tourism, travel);
    }

    @Test
    void confirmedMissingSecondPlaceFailsBeforeAnyRouteCall() {
        when(tourism.findPlace("tourapi-1")).thenReturn(known(new DiagnosisContext.Place("A", COORDINATE, known("26"))));
        when(tourism.findPlace("tourapi-2")).thenThrow(new IllegalArgumentException("없는 장소"));
        assertThatThrownBy(() -> service.diagnose(command(List.of(stop("tourapi-1"), stop("tourapi-2")))))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(travel);
    }

    @Test
    void durationOverflowAndOutOfRangeFixedVisitAreInputErrors() {
        var huge = new DiagnosisCommand.Stop("tourapi-1", null, Long.MAX_VALUE, List.of());
        assertThatThrownBy(() -> service.diagnose(command(List.of(huge)))).isInstanceOf(IllegalArgumentException.class);
        var fixed = new DiagnosisCommand.Stop("tourapi-1", "08:59", 600, List.of());
        assertThatThrownBy(() -> service.diagnose(command(List.of(fixed)))).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(tourism, travel);
    }

    private DiagnosisCommand.Stop stop(String id) {
        return new DiagnosisCommand.Stop(id, null, 600, List.of());
    }

    private DiagnosisCommand command(List<DiagnosisCommand.Stop> stops) {
        return new DiagnosisCommand("2026-10-26", "09:00", "12:00", "Asia/Seoul", "CAR",
                new DiagnosisCommand.Departure("부산역", 35.1151, 129.0414), stops);
    }
}
