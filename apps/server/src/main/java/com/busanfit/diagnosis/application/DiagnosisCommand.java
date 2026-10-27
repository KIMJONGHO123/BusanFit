package com.busanfit.diagnosis.application;

import java.util.List;

public record DiagnosisCommand(String travelDate, String startTime, String endTime, String timeZone,
                               String transportMode, Departure departure, List<Stop> stops) {
    public record Departure(String name, Double latitude, Double longitude) { }
    public record Stop(String placeId, String plannedVisitTime, long plannedStaySeconds, List<Activity> activities) { }
    public record Activity(String code, Long durationSeconds) { }
}
