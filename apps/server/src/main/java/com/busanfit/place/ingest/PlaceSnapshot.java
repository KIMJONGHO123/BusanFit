package com.busanfit.place.ingest;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Selected service data only; external response objects never leave the source adapter. */
public record PlaceSnapshot(
        String externalId, String name, String address, String regionCode,
        Double latitude, Double longitude, String sourceModifiedAt,
        Instant checkedAt, Map<String, Object> details, Map<String, Object> fieldStatus) {

    public enum Source { TOURAPI, BUSAN }

    public record Collection(Source source, List<PlaceSnapshot> places, int pages, int expectedCount) {
        public Collection {
            places = List.copyOf(places);
            if (places.size() != expectedCount || places.stream().map(PlaceSnapshot::externalId).distinct().count()
                    != expectedCount) {
                throw new IllegalArgumentException("INCOMPLETE_OR_DUPLICATE_COLLECTION");
            }
        }
    }
}
