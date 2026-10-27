package com.busanfit.diagnosis.domain;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;

public final class ScheduleCalculator {
    public DiagnosisSchedule calculate(DiagnosisContext context) {
        OffsetDateTime cursor = context.start();
        long totalStay = 0;
        long totalTravel = 0;
        long totalWaiting = 0;
        boolean allRoutesKnown = true;
        var timings = new ArrayList<DiagnosisSchedule.StopTiming>();
        for (int index = 0; index < context.stops().size(); index++) {
            var stop = context.stops().get(index);
            var route = context.segments().get(index).route();
            totalStay = Math.addExact(totalStay, stop.plannedStaySeconds());
            if (route.confirmed()) {
                totalTravel = Math.addExact(totalTravel, route.value().seconds());
            } else {
                allRoutesKnown = false;
                cursor = null;
            }
            OffsetDateTime arrival = null;
            OffsetDateTime stayStart = null;
            OffsetDateTime departure = null;
            Long waiting = null;
            if (cursor != null) {
                arrival = cursor.plusSeconds(route.value().seconds());
                stayStart = stop.plannedVisitTime() != null && stop.plannedVisitTime().isAfter(arrival)
                        ? stop.plannedVisitTime() : arrival;
                waiting = Duration.between(arrival, stayStart).getSeconds();
                totalWaiting = Math.addExact(totalWaiting, waiting);
                departure = stayStart.plusSeconds(stop.plannedStaySeconds());
                cursor = departure;
            }
            timings.add(new DiagnosisSchedule.StopTiming(index, stop.placeId(), stop.plannedVisitTime(),
                    stop.plannedStaySeconds(), stop.activitySeconds(), arrival, stayStart, departure, waiting,
                    cursor != null, cursor == null ? "이 구간까지의 이동시간을 확인하지 못했습니다." : null));
        }
        long available = Duration.between(context.start(), context.end()).getSeconds();
        Long required = cursor == null ? null : Duration.between(context.start(), cursor).getSeconds();
        return new DiagnosisSchedule(context.start(), context.end(), available, totalStay,
                allRoutesKnown ? totalTravel : null, cursor == null ? null : totalWaiting,
                required, required == null ? null : available - required, cursor != null,
                timings, context.segments());
    }
}
