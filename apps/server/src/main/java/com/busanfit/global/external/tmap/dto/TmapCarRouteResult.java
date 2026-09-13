package com.busanfit.global.external.tmap.dto;

import java.util.List;

public record TmapCarRouteResult(
        int totalTimeSeconds,
        int totalTimeMinutes,
        int totalDistanceMeters,
        List<TmapRouteCoordinate> coordinates,
        String rawResponse
) {
    public TmapCarRouteResult(
            int totalTimeSeconds,
            int totalTimeMinutes,
            int totalDistanceMeters,
            String rawResponse
    ) {
        this(totalTimeSeconds, totalTimeMinutes, totalDistanceMeters, List.of(), rawResponse);
    }

    public TmapCarRouteResult {
        coordinates = coordinates == null ? List.of() : List.copyOf(coordinates);
    }
}
