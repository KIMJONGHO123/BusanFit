package com.busanfit.diagnosis.application.port;

import com.busanfit.diagnosis.domain.DiagnosisContext.Place;
import com.busanfit.diagnosis.domain.Evidence;

public interface TourismPort {
    Evidence<Place> findPlace(String placeId);
}
