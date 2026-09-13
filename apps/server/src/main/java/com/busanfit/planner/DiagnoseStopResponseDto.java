package com.busanfit.planner;

import java.util.List;

public record DiagnoseStopResponseDto(
        String placeId,
        String placeName,
        int order,
        String arrivalTime,
        String departureTime,
        int baseStayMinutes,
        int activityMinutes,
        int stayMinutes,
        int travelMinutesFromPrevious,
        int travelDistanceMetersFromPrevious,
        List<com.busanfit.global.external.tmap.dto.TmapRouteCoordinate> routeCoordinatesFromPrevious,
        DiagnosisStatus status,
        List<String> reasons
) {
}
