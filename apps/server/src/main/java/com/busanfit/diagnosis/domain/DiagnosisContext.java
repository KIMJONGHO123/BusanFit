package com.busanfit.diagnosis.domain;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;

public record DiagnosisContext(OffsetDateTime start, OffsetDateTime end, Coordinate departure,
                               List<Stop> stops, List<Segment> segments) {
    public record Coordinate(double latitude, double longitude) {
        public Coordinate {
            if (!Double.isFinite(latitude) || Math.abs(latitude) > 90
                    || !Double.isFinite(longitude) || Math.abs(longitude) > 180) {
                throw new IllegalArgumentException("좌표가 올바르지 않습니다.");
            }
        }
    }

    public record Place(String name, Coordinate coordinate, Evidence<String> region) {
        public Place {
            if (name == null || name.isBlank()) {
                throw new IllegalArgumentException("장소 이름이 필요합니다.");
            }
            Objects.requireNonNull(coordinate);
            Objects.requireNonNull(region);
        }
    }

    public record Stop(String placeId, OffsetDateTime plannedVisitTime, long plannedStaySeconds,
                       long activitySeconds, Evidence<Place> place, Evidence<Long> recommendedTotalStaySeconds) {
        public Stop {
            Objects.requireNonNull(recommendedTotalStaySeconds);
            if (placeId == null || placeId.isBlank() || plannedStaySeconds <= 0 || activitySeconds < 0
                    || (recommendedTotalStaySeconds.confirmed() && recommendedTotalStaySeconds.value() <= 0)) {
                throw new IllegalArgumentException("장소·최종 체류시간이 올바르지 않습니다.");
            }
            Objects.requireNonNull(place);
        }
    }

    public record Route(long seconds, long distanceMeters, List<Coordinate> coordinates) {
        public Route {
            if (seconds < 0 || distanceMeters < 0) {
                throw new IllegalArgumentException("이동시간·거리는 음수일 수 없습니다.");
            }
            coordinates = List.copyOf(coordinates);
            if (coordinates.isEmpty()) {
                throw new IllegalArgumentException("확인된 경로 좌표가 필요합니다.");
            }
        }
    }

    public record Segment(String segmentId, String from, String to, Evidence<Route> route) {
        public Segment {
            Objects.requireNonNull(segmentId);
            Objects.requireNonNull(from);
            Objects.requireNonNull(to);
            Objects.requireNonNull(route);
        }
    }

    public DiagnosisContext {
        Objects.requireNonNull(start);
        Objects.requireNonNull(end);
        Objects.requireNonNull(departure);
        stops = List.copyOf(stops);
        segments = List.copyOf(segments);
        if (!end.isAfter(start) || !start.toLocalDate().equals(end.toLocalDate())
                || !start.getOffset().equals(end.getOffset()) || stops.isEmpty() || stops.size() != segments.size()) {
            throw new IllegalArgumentException("하루 일정과 장소별 이동 구간이 필요합니다.");
        }
        var ids = new HashSet<String>();
        var segmentIds = new HashSet<String>();
        for (int i = 0; i < stops.size(); i++) {
            Stop stop = stops.get(i);
            Segment segment = segments.get(i);
            if (!ids.add(stop.placeId()) || !segmentIds.add(segment.segmentId())
                    || !segment.to().equals(stop.placeId())
                    || !segment.from().equals(i == 0 ? "DEPARTURE" : stops.get(i - 1).placeId())
                    || stop.plannedVisitTime() != null && (stop.plannedVisitTime().isBefore(start)
                    || stop.plannedVisitTime().isAfter(end)
                    || !stop.plannedVisitTime().getOffset().equals(start.getOffset()))) {
                throw new IllegalArgumentException("방문 순서·중복 장소·고정 방문시간이 올바르지 않습니다.");
            }
        }
    }
}
