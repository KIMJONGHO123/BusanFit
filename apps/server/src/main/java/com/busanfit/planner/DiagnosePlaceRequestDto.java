package com.busanfit.planner;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record DiagnosePlaceRequestDto(
        @NotBlank(message = "관광지 ID는 필수입니다.")
        String placeId,

        List<ActivityType> activities
) {
    public List<ActivityType> activitiesOrEmpty() {
        return activities == null ? List.of() : activities;
    }
}
