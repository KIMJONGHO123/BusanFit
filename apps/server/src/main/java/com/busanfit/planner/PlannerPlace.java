package com.busanfit.planner;

import java.time.LocalTime;

record PlannerPlace(
        String id,
        String name,
        double latitude,
        double longitude,
        String category,
        int baseStayMinutes,
        LocalTime opensAt,
        LocalTime closesAt,
        PlaceEnvironment environment
) {
}
