package com.busanfit.global.external.tmap.dto;

import jakarta.validation.constraints.NotNull;

public record TmapCarRouteRequest(
        @NotNull(message = "출발지 위도는 필수입니다.")
        Double startLatitude,

        @NotNull(message = "출발지 경도는 필수입니다.")
        Double startLongitude,

        @NotNull(message = "목적지 위도는 필수입니다.")
        Double endLatitude,

        @NotNull(message = "목적지 경도는 필수입니다.")
        Double endLongitude
) {
}
