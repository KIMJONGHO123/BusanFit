package com.busanfit.diagnosis.application.port;

import com.busanfit.diagnosis.domain.DiagnosisContext.Coordinate;
import com.busanfit.diagnosis.domain.DiagnosisContext.Route;
import com.busanfit.diagnosis.domain.Evidence;

public interface TravelTimePort {
    Evidence<Route> findRoute(Coordinate from, Coordinate to);
}
