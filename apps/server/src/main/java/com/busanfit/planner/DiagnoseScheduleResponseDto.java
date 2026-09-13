package com.busanfit.planner;

import java.util.List;

public record DiagnoseScheduleResponseDto(
        String diagnosisId,
        DiagnosisStatus status,
        boolean feasible,
        String startTime,
        String expectedEndTime,
        String summary,
        int availableMinutes,
        int requiredMinutes,
        int remainingMinutes,
        int totalStayMinutes,
        int totalTravelMinutes,
        List<DiagnoseStopResponseDto> stops,
        List<String> warnings
) {
}
