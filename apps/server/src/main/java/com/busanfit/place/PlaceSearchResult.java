package com.busanfit.place;

public record PlaceSearchResult(
        String id,
        String name,
        String address,
        String category,
        double latitude,
        double longitude,
        String imageUrl,
        int estimatedStayMinutes
) {
}
