package com.busanfit.diagnosis.adapter;

import com.busanfit.diagnosis.application.port.TravelTimePort;
import com.busanfit.diagnosis.domain.DiagnosisContext.Coordinate;
import com.busanfit.diagnosis.domain.DiagnosisContext.Route;
import com.busanfit.diagnosis.domain.Evidence;
import com.busanfit.global.external.tmap.TmapApiException;
import com.busanfit.global.external.tmap.TmapClient;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

@Component
public class TmapTravelTimeAdapter implements TravelTimePort {
    private final TmapClient client;
    private final Clock clock;

    public TmapTravelTimeAdapter(TmapClient client, Clock diagnosisClock) {
        this.client = client;
        this.clock = diagnosisClock;
    }

    @Override
    public Evidence<Route> findRoute(Coordinate from, Coordinate to) {
        try {
            var response = client.getCarRoute(from.latitude(), from.longitude(), to.latitude(), to.longitude());
            if (response == null) {
                return unavailable();
            }
            var coordinates = response.coordinates().stream()
                    .map(c -> new Coordinate(c.latitude(), c.longitude())).toList();
            return Evidence.known(new Route(response.totalTimeSeconds(), response.totalDistanceMeters(), coordinates),
                    "TMAP", OffsetDateTime.now(clock));
        } catch (TmapApiException | RestClientException | IllegalArgumentException e) {
            return unavailable();
        }
    }

    private Evidence<Route> unavailable() {
        return Evidence.unavailable("TMAP", OffsetDateTime.now(clock),
                "TMAP의 조회 시점 예상 이동시간·경로를 확인하지 못했습니다. 미래 출발시각 예측은 제공하지 않습니다.");
    }
}
