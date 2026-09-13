package com.busanfit.planner;

import com.busanfit.global.external.tmap.TmapClient;
import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlannerDiagnosisService {

    private static final double HIGH_TRAVEL_RATIO = 0.4;
    private static final int LOW_REMAINING_MINUTES = 30;

    private final PlannerPlaceCatalog placeCatalog;
    private final TmapClient tmapClient;

    public DiagnoseScheduleResponseDto diagnose(DiagnoseScheduleRequestDto request) {
        LocalDate date = parseDate(request.date());
        LocalTime startTime = parseTime(request.startTime(), "여행 시작 시간 형식이 올바르지 않습니다.");
        LocalTime endTime = parseTime(request.endTime(), "여행 종료 시간 형식이 올바르지 않습니다.");
        validateTimeRange(startTime, endTime);

        int availableMinutes = (int) Duration.between(startTime, endTime).toMinutes();
        LocalDateTime cursor = LocalDateTime.of(date, startTime);
        LocationCursor previousLocation = new LocationCursor(
                request.startLocation().name(),
                request.startLocation().latitude(),
                request.startLocation().longitude()
        );

        List<DiagnoseStopResponseDto> stops = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int totalStayMinutes = 0;
        int totalTravelMinutes = 0;
        boolean hasImpossibleStop = false;

        for (int index = 0; index < request.places().size(); index++) {
            DiagnosePlaceRequestDto requestedPlace = request.places().get(index);
            PlannerPlace place = placeCatalog.getById(requestedPlace.placeId());

            // 출발지 또는 직전 관광지에서 현재 관광지까지의 이동 시간을 먼저 누적합니다.
            TmapCarRouteResult route = getCarRoute(previousLocation, place);
            int travelMinutes = route.totalTimeMinutes();
            totalTravelMinutes += travelMinutes;
            cursor = cursor.plusMinutes(travelMinutes);

            LocalDateTime arrivalTime = cursor;
            int activityMinutes = sumActivityMinutes(requestedPlace.activitiesOrEmpty());
            int stayMinutes = place.baseStayMinutes() + activityMinutes;
            LocalDateTime departureTime = arrivalTime.plusMinutes(stayMinutes);
            totalStayMinutes += stayMinutes;

            // 운영시간과 날씨 민감 활동처럼 장소별로 문제가 될 수 있는 조건을 모읍니다.
            List<String> stopReasons = new ArrayList<>();
            if (arrivalTime.toLocalTime().isAfter(place.closesAt())) {
                stopReasons.add(place.name() + " 예상 도착 시간이 운영 종료 시간보다 늦습니다.");
            }
            if (departureTime.toLocalTime().isAfter(place.closesAt())) {
                stopReasons.add(place.name() + " 예상 출발 시간이 운영 종료 시간보다 늦습니다.");
            }
            if (arrivalTime.toLocalTime().isBefore(place.opensAt())) {
                stopReasons.add(place.name() + " 운영 시작 전 도착 예정입니다.");
            }
            if (place.environment() == PlaceEnvironment.OUTDOOR
                    && requestedPlace.activitiesOrEmpty().stream().anyMatch(ActivityType::isWeatherSensitive)) {
                warnings.add(place.name() + "은 야외 장소이며 선택한 활동이 날씨 영향을 받을 수 있습니다.");
            }

            DiagnosisStatus stopStatus = stopReasons.isEmpty()
                    ? DiagnosisStatus.AVAILABLE
                    : DiagnosisStatus.IMPOSSIBLE;
            hasImpossibleStop = hasImpossibleStop || stopStatus == DiagnosisStatus.IMPOSSIBLE;

            stops.add(new DiagnoseStopResponseDto(
                    place.id(),
                    place.name(),
                    index + 1,
                    formatTime(arrivalTime),
                    formatTime(departureTime),
                    place.baseStayMinutes(),
                    activityMinutes,
                    stayMinutes,
                    travelMinutes,
                    route.totalDistanceMeters(),
                    route.coordinates(),
                    stopStatus,
                    stopReasons
            ));

            cursor = departureTime;
            previousLocation = new LocationCursor(place.name(), place.latitude(), place.longitude());
        }

        int requiredMinutes = (int) Duration.between(LocalDateTime.of(date, startTime), cursor).toMinutes();
        int remainingMinutes = availableMinutes - requiredMinutes;

        if (remainingMinutes < LOW_REMAINING_MINUTES && remainingMinutes >= 0) {
            warnings.add("일정 여유 시간이 30분 미만입니다.");
        }
        if (availableMinutes > 0 && ((double) totalTravelMinutes / availableMinutes) >= HIGH_TRAVEL_RATIO) {
            warnings.add("전체 일정에서 이동 시간이 차지하는 비율이 높습니다.");
        }

        DiagnosisStatus status = decideStatus(hasImpossibleStop, remainingMinutes, warnings);

        return new DiagnoseScheduleResponseDto(
                UUID.randomUUID().toString(),
                status,
                status != DiagnosisStatus.IMPOSSIBLE,
                request.startTime(),
                formatTime(cursor),
                buildSummary(status, remainingMinutes),
                availableMinutes,
                requiredMinutes,
                remainingMinutes,
                totalStayMinutes,
                totalTravelMinutes,
                stops,
                warnings
        );
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("여행 날짜 형식이 올바르지 않습니다. 예: 2026-09-10");
        }
    }

    private LocalTime parseTime(String value, String errorMessage) {
        try {
            return LocalTime.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(errorMessage);
        }
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("여행 종료 시간은 시작 시간보다 늦어야 합니다.");
        }
    }

    private int sumActivityMinutes(List<ActivityType> activities) {
        return activities.stream()
                .mapToInt(ActivityType::getMinutes)
                .sum();
    }

    private TmapCarRouteResult getCarRoute(LocationCursor from, PlannerPlace to) {
        return tmapClient.getCarRoute(
                from.latitude(),
                from.longitude(),
                to.latitude(),
                to.longitude()
        );
    }

    private DiagnosisStatus decideStatus(boolean hasImpossibleStop, int remainingMinutes, List<String> warnings) {
        if (hasImpossibleStop || remainingMinutes < 0) {
            return DiagnosisStatus.IMPOSSIBLE;
        }
        if (!warnings.isEmpty()) {
            return DiagnosisStatus.WARNING;
        }

        return DiagnosisStatus.AVAILABLE;
    }

    private String buildSummary(DiagnosisStatus status, int remainingMinutes) {
        if (status == DiagnosisStatus.IMPOSSIBLE) {
            return "현재 조건으로는 일정 조정이 필요합니다.";
        }
        if (status == DiagnosisStatus.WARNING) {
            return "일정 수행은 가능하지만 이동 시간이나 여유 시간을 확인해 주세요.";
        }

        return "입력한 시간 안에 방문할 수 있는 일정입니다. 예상 여유 시간은 " + remainingMinutes + "분입니다.";
    }

    private String formatTime(LocalDateTime value) {
        return value.toLocalTime().toString();
    }

    private record LocationCursor(
            String name,
            double latitude,
            double longitude
    ) {
    }
}
