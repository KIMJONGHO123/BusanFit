package com.busanfit.diagnosis.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public final class DiagnosisFixtures {
    public static final OffsetDateTime START = OffsetDateTime.parse("2026-10-26T09:00:00+09:00");
    public static final Clock CLOCK = Clock.fixed(START.toInstant(), ZoneOffset.UTC);
    public static final DiagnosisContext.Coordinate COORDINATE = new DiagnosisContext.Coordinate(35, 129);

    private DiagnosisFixtures() { }

    public static DiagnosisContext context(long available, long[] stays, Long[] routes, String[] regions) {
        var stops = new ArrayList<DiagnosisContext.Stop>();
        var segments = new ArrayList<DiagnosisContext.Segment>();
        for (int i = 0; i < stays.length; i++) {
            String id = "tourapi-" + (i + 1);
            Evidence<String> region = regions[i] == null ? unknown("지역 미확인") : known(regions[i]);
            stops.add(new DiagnosisContext.Stop(id, null, stays[i], 0,
                    known(new DiagnosisContext.Place("장소 " + i, COORDINATE, region)), unknown("권장시간 근거·포함 범위 미확인")));
            Evidence<DiagnosisContext.Route> route = routes[i] == null ? unknown("이동시간 미확인")
                    : known(new DiagnosisContext.Route(routes[i], 100, List.of(COORDINATE)));
            segments.add(new DiagnosisContext.Segment("segment-" + i, i == 0 ? "DEPARTURE" : "tourapi-" + i, id, route));
        }
        return new DiagnosisContext(START, START.plusSeconds(available), COORDINATE, stops, segments);
    }

    public static DiagnosisContext fixed(DiagnosisContext original, int index, OffsetDateTime time) {
        var stops = new ArrayList<>(original.stops());
        var previous = stops.get(index);
        stops.set(index, new DiagnosisContext.Stop(previous.placeId(), time, previous.plannedStaySeconds(),
                previous.activitySeconds(), previous.place(), previous.recommendedTotalStaySeconds()));
        return new DiagnosisContext(original.start(), original.end(), original.departure(), stops, original.segments());
    }

    public static DiagnosisEngine engine() {
        return new DiagnosisEngine(new RuleRegistry(CoreRules.national(CoreRules.Policy.defaults()), true), CLOCK);
    }

    public static <T> Evidence<T> known(T value) {
        return Evidence.known(value, "fixture", START);
    }

    public static <T> Evidence<T> unknown(String reason) {
        return Evidence.unavailable("fixture", START, reason);
    }
}
