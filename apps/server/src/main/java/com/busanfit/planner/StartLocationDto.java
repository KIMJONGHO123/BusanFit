package com.busanfit.planner;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StartLocationDto(
        @NotBlank(message = "출발 위치 이름은 필수입니다.")
        String name,

        @NotNull(message = "출발 위치 위도는 필수입니다.")
        Double latitude,

        @NotNull(message = "출발 위치 경도는 필수입니다.")
        Double longitude
) {
}
