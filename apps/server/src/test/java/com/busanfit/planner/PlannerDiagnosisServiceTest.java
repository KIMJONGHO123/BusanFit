package com.busanfit.planner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.busanfit.global.external.tmap.TmapClient;
import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import com.busanfit.global.external.tmap.dto.TmapRouteCoordinate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PlannerDiagnosisServiceTest {

    private TmapClient tmapClient;
    private PlannerDiagnosisService plannerDiagnosisService;

    @BeforeEach
    void setUp() {
        tmapClient = mock(TmapClient.class);
        plannerDiagnosisService = new PlannerDiagnosisService(new PlannerPlaceCatalog(), tmapClient);

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
    void diagnoseIncludesFirstTravelAndActivityMinutesWithoutRounding() {
        DiagnoseScheduleResponseDto result = plannerDiagnosisService.diagnose(
                new DiagnoseScheduleRequestDto(
                        "2026-09-10",
                        "10:00",
                        "14:00",
                        new StartLocationDto("부산역", 35.1151, 129.0414),
                        List.of(new DiagnosePlaceRequestDto(
                                "place-haeundae-beach",
                                List.of(ActivityType.PHOTO, ActivityType.WALK)
                        ))
                )
        );

        DiagnoseStopResponseDto firstStop = result.stops().getFirst();

        // 출발지에서 첫 관광지까지 이동 시간이 먼저 더해지므로 도착 시간은 시작 시간과 다릅니다.
        assertThat(firstStop.travelMinutesFromPrevious()).isEqualTo(30);
        assertThat(firstStop.travelDistanceMetersFromPrevious()).isEqualTo(10000);
        assertThat(firstStop.routeCoordinatesFromPrevious()).containsExactly(
                new TmapRouteCoordinate(35.1151, 129.0414),
                new TmapRouteCoordinate(35.1587, 129.1604)
        );
        assertThat(firstStop.arrivalTime()).isEqualTo("10:30");
        assertThat(firstStop.baseStayMinutes()).isEqualTo(90);
        assertThat(firstStop.activityMinutes()).isEqualTo(50);
        assertThat(firstStop.stayMinutes()).isEqualTo(140);
        assertThat(result.totalStayMinutes()).isEqualTo(140);
        assertThat(result.requiredMinutes()).isEqualTo(
                firstStop.travelMinutesFromPrevious() + firstStop.stayMinutes()
        );
        assertThat(result.feasible()).isTrue();
        assertThat(result.status()).isEqualTo(DiagnosisStatus.WARNING);
        assertThat(result.warnings()).contains("해운대해수욕장은 야외 장소이며 선택한 활동이 날씨 영향을 받을 수 있습니다.");
    }

    @Test
    void diagnoseMarksScheduleImpossibleWhenPlaceIsVisitedAfterClosingTime() {
        DiagnoseScheduleResponseDto result = plannerDiagnosisService.diagnose(
                new DiagnoseScheduleRequestDto(
                        "2026-09-10",
                        "17:30",
                        "20:00",
                        new StartLocationDto("부산역", 35.1151, 129.0414),
                        List.of(new DiagnosePlaceRequestDto(
                                "place-gamcheon-culture-village",
                                List.of()
                        ))
                )
        );

        assertThat(result.status()).isEqualTo(DiagnosisStatus.IMPOSSIBLE);
        assertThat(result.feasible()).isFalse();
        assertThat(result.stops().getFirst().status()).isEqualTo(DiagnosisStatus.IMPOSSIBLE);
        assertThat(result.stops().getFirst().reasons())
                .anyMatch(reason -> reason.contains("운영 종료 시간보다 늦습니다."));
    }

    @Test
    void diagnoseRejectsEndTimeBeforeStartTime() {
        DiagnoseScheduleRequestDto request = new DiagnoseScheduleRequestDto(
                "2026-09-10",
                "20:00",
                "10:00",
                new StartLocationDto("부산역", 35.1151, 129.0414),
                List.of(new DiagnosePlaceRequestDto("place-haeundae-beach", List.of()))
        );

        assertThatThrownBy(() -> plannerDiagnosisService.diagnose(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("여행 종료 시간은 시작 시간보다 늦어야 합니다.");
    }
}
