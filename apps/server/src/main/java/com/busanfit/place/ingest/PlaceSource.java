package com.busanfit.place.ingest;

public interface PlaceSource {
    PlaceSnapshot.Collection collect(PlaceSnapshot.Source source);
}
