package com.busanfit.diagnosis.domain;

import java.time.OffsetDateTime;
import java.util.List;

public record DiagnosisSchedule(OffsetDateTime start, OffsetDateTime end, long availableSeconds,
                                long totalStaySeconds, Long totalTravelSeconds, Long totalWaitingSeconds,
                                Long requiredSeconds, Long remainingSeconds, boolean calculationComplete,
                                List<StopTiming> stops, List<DiagnosisContext.Segment> segments) {
    public record StopTiming(int stopIndex, String placeId, OffsetDateTime plannedVisitTime,
                             long plannedStaySeconds, long activitySeconds, OffsetDateTime arrival,
                             OffsetDateTime stayStart, OffsetDateTime departure, Long waitingSeconds,
                             boolean calculationComplete, String limitation) { }

    public DiagnosisSchedule {
        stops = List.copyOf(stops);
        segments = List.copyOf(segments);
    }
}
