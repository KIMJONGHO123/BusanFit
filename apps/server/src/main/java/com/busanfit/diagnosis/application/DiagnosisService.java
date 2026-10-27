package com.busanfit.diagnosis.application;

import com.busanfit.diagnosis.application.port.TourismPort;
import com.busanfit.diagnosis.application.port.TravelTimePort;
import com.busanfit.diagnosis.domain.DiagnosisContext;
import com.busanfit.diagnosis.domain.DiagnosisEngine;
import com.busanfit.diagnosis.domain.DiagnosisResult;
import com.busanfit.diagnosis.domain.Evidence;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DiagnosisService {
    private final TourismPort tourism;
    private final TravelTimePort travel;
    private final DiagnosisEngine engine;
    private final Clock clock;

    public DiagnosisService(TourismPort tourism, TravelTimePort travel, DiagnosisEngine engine, Clock diagnosisClock) {
        this.tourism = tourism;
        this.travel = travel;
        this.engine = engine;
        this.clock = diagnosisClock;
    }

    public DiagnosisResult diagnose(DiagnosisCommand request) {
        var input = new DiagnosisInputValidator().validate(request);
        // Resolve every place first: a confirmed nonexistent ID must fail before paid route calls.
        var places = input.stops().stream().map(s -> tourism.findPlace(s.placeId())).toList();
        var stops = new ArrayList<DiagnosisContext.Stop>();
        var segments = new ArrayList<DiagnosisContext.Segment>();
        DiagnosisContext.Coordinate from = input.departure();
        for (int i = 0; i < input.stops().size(); i++) {
            var requested = input.stops().get(i);
            var place = places.get(i);
            var to = place.confirmed() ? place.value().coordinate() : null;
            Evidence<DiagnosisContext.Route> route = from == null || to == null
                    ? Evidence.unavailable("TMAP", OffsetDateTime.now(clock), "구간 출발·도착 장소 좌표를 서버에서 확인하지 못했습니다.")
                    : travel.findRoute(from, to);
            stops.add(new DiagnosisContext.Stop(requested.placeId(), requested.visitTime(), requested.staySeconds(),
                    requested.activitySeconds(), place, Evidence.unavailable("UNSUPPORTED", null,
                    "권장 총체류시간의 근거와 활동 포함 범위를 확인하지 못했습니다.")));
            segments.add(new DiagnosisContext.Segment("segment-" + i,
                    i == 0 ? "DEPARTURE" : input.stops().get(i - 1).placeId(), requested.placeId(), route));
            from = to;
        }
        return engine.diagnose(new DiagnosisContext(input.start(), input.end(), input.departure(),
                List.copyOf(stops), List.copyOf(segments)));
    }
}
