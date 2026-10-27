package com.busanfit.diagnosis.application;

import com.busanfit.diagnosis.domain.DiagnosisContext;
import com.busanfit.planner.ActivityType;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

/** Validates the entire request before any external call. */
public final class DiagnosisInputValidator {
    public record StopInput(String placeId, OffsetDateTime visitTime, long staySeconds, long activitySeconds) { }
    public record Input(OffsetDateTime start, OffsetDateTime end, DiagnosisContext.Coordinate departure,
                        List<StopInput> stops) { }

    public Input validate(DiagnosisCommand request) {
        try {
            return parse(request);
        } catch (DateTimeException | ArithmeticException e) {
            throw new IllegalArgumentException("일정 날짜·시간·소요시간이 올바르지 않습니다.");
        }
    }

    private Input parse(DiagnosisCommand request) {
        if (request.departure() == null || request.departure().name() == null || request.departure().name().isBlank()
                || request.departure().latitude() == null || request.departure().longitude() == null
                || request.stops() == null || request.stops().isEmpty()) {
            throw new IllegalArgumentException("출발지와 방문 장소가 필요합니다.");
        }
        if (!"Asia/Seoul".equals(request.timeZone()) || !"CAR".equals(request.transportMode())) {
            throw new IllegalArgumentException("현재 Asia/Seoul·CAR만 지원합니다.");
        }
        if (request.travelDate() == null || !request.travelDate().matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")
                || request.travelDate().startsWith("0000")) {
            throw new IllegalArgumentException("여행 날짜는 YYYY-MM-DD 형식이어야 합니다.");
        }
        LocalDate date = LocalDate.parse(request.travelDate());
        var start = at(date, request.startTime());
        var end = at(date, request.endTime());
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("같은 날의 종료시간은 시작시간보다 늦어야 합니다.");
        }
        var departure = new DiagnosisContext.Coordinate(request.departure().latitude(), request.departure().longitude());
        var ids = new HashSet<String>();
        var stops = new ArrayList<StopInput>();
        long totalStay = 0;
        for (var stop : request.stops()) {
            if (stop == null || stop.placeId() == null || !stop.placeId().matches("tourapi-[0-9]+") || !ids.add(stop.placeId())) {
                throw new IllegalArgumentException("검색 장소 ID가 올바르지 않거나 중복됐습니다.");
            }
            OffsetDateTime visitTime = stop.plannedVisitTime() == null ? null : at(date, stop.plannedVisitTime());
            if (visitTime != null && (visitTime.isBefore(start) || visitTime.isAfter(end))) {
                throw new IllegalArgumentException("고정 방문시간은 여행시간 범위 안이어야 합니다.");
            }
            long stay = positiveSeconds(stop.plannedStaySeconds());
            totalStay = Math.addExact(totalStay, stay);
            // Verify timestamp representability before looking up places or routes.
            end.plusSeconds(totalStay);
            long activities = 0;
            var codes = new HashSet<ActivityType>();
            for (var activity : stop.activities() == null ? List.<DiagnosisCommand.Activity>of() : stop.activities()) {
                if (activity == null) {
                    throw new IllegalArgumentException("활동이 올바르지 않습니다.");
                }
                var type = ActivityType.from(activity.code());
                if (!codes.add(type)) {
                    throw new IllegalArgumentException("같은 장소의 중복 활동은 허용하지 않습니다.");
                }
                boolean custom = type == ActivityType.REST || type == ActivityType.OTHER;
                if (!custom && activity.durationSeconds() != null) {
                    throw new IllegalArgumentException("일반 활동시간은 서버 정책으로 결정합니다.");
                }
                activities = Math.addExact(activities, custom ? positiveSeconds(activity.durationSeconds())
                        : type.getMinutes() * 60L);
            }
            stops.add(new StopInput(stop.placeId(), visitTime, stay, activities));
        }
        return new Input(start, end, departure, List.copyOf(stops));
    }

    private long positiveSeconds(Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException("소요시간은 양의 정수 초여야 합니다.");
        }
        return value;
    }

    private OffsetDateTime at(LocalDate date, String time) {
        if (time == null || !time.matches("([01][0-9]|2[0-3]):[0-5][0-9]")) {
            throw new IllegalArgumentException("시간은 HH:mm 형식이어야 합니다.");
        }
        return date.atTime(LocalTime.parse(time)).atZone(ZoneId.of("Asia/Seoul")).toOffsetDateTime();
    }
}
