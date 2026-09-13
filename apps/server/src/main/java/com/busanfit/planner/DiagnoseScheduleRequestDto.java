package com.busanfit.planner;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record DiagnoseScheduleRequestDto(
        @NotBlank(message = "여행 날짜는 필수입니다.")
        String date,

        @NotBlank(message = "여행 시작 시간은 필수입니다.")
        String startTime,

        @NotBlank(message = "여행 종료 시간은 필수입니다.")
        String endTime,

        @Valid
        @NotNull(message = "출발 위치는 필수입니다.")
        StartLocationDto startLocation,

        @Valid
        @NotEmpty(message = "방문할 관광지는 1개 이상 선택해야 합니다.")
        List<DiagnosePlaceRequestDto> places
) {
}
