package com.busanfit.diagnosis.api;

import com.busanfit.diagnosis.application.DiagnosisCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import tools.jackson.databind.JsonNode;

public record DiagnosisRequest(@NotBlank String travelDate, @NotBlank String startTime, @NotBlank String endTime,
                               @NotBlank String timeZone, @NotBlank String transportMode,
                               @NotNull @Valid Departure departure,
                               @NotEmpty List<@NotNull @Valid Stop> stops) {
    public record Departure(@NotBlank String name, @NotNull Double latitude, @NotNull Double longitude) { }
    public record Stop(@NotBlank String placeId, String plannedVisitTime,
                       @NotNull JsonNode plannedStaySeconds, List<@NotNull @Valid Activity> activities) { }
    public record Activity(@NotBlank String code, JsonNode durationSeconds) { }

    public DiagnosisCommand toCommand() {
        return new DiagnosisCommand(travelDate, startTime, endTime, timeZone, transportMode,
                new DiagnosisCommand.Departure(departure.name(), departure.latitude(), departure.longitude()),
                stops.stream().map(s -> new DiagnosisCommand.Stop(s.placeId(), s.plannedVisitTime(),
                        positiveSeconds(s.plannedStaySeconds()),
                        (s.activities() == null ? List.<Activity>of() : s.activities()).stream()
                                .map(a -> new DiagnosisCommand.Activity(a.code(),
                                        a.durationSeconds() == null || a.durationSeconds().isNull()
                                                ? null : positiveSeconds(a.durationSeconds()))).toList())).toList());
    }

    private static long positiveSeconds(JsonNode value) {
        if (value == null || !value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("소요시간은 양의 정수 초여야 합니다.");
        }
        return value.longValue();
    }
}
