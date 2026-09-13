package com.busanfit.planner;

import java.time.LocalTime;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class PlannerPlaceCatalog {

    private final Map<String, PlannerPlace> places = Map.of(
            "place-haeundae-beach",
            new PlannerPlace(
                    "place-haeundae-beach",
                    "해운대해수욕장",
                    35.1587,
                    129.1604,
                    "자연/야외",
                    90,
                    LocalTime.of(0, 0),
                    LocalTime.of(23, 59),
                    PlaceEnvironment.OUTDOOR
            ),
            "place-gwangalli-beach",
            new PlannerPlace(
                    "place-gwangalli-beach",
                    "광안리해수욕장",
                    35.1532,
                    129.1186,
                    "자연/야외",
                    80,
                    LocalTime.of(0, 0),
                    LocalTime.of(23, 59),
                    PlaceEnvironment.OUTDOOR
            ),
            "place-gamcheon-culture-village",
            new PlannerPlace(
                    "place-gamcheon-culture-village",
                    "감천문화마을",
                    35.0975,
                    129.0106,
                    "문화/관광",
                    100,
                    LocalTime.of(9, 0),
                    LocalTime.of(18, 0),
                    PlaceEnvironment.OUTDOOR
            )
    );

    PlannerPlace getById(String placeId) {
        PlannerPlace place = places.get(placeId);
        if (place == null) {
            throw new IllegalArgumentException("지원하지 않는 관광지입니다: " + placeId);
        }

        return place;
    }
}
