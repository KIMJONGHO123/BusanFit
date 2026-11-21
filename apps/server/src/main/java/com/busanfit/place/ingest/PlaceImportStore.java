package com.busanfit.place.ingest;

import java.util.List;
import java.util.Map;

public interface PlaceImportStore {
    Map<PlaceSnapshot.Source, Long> begin();
    void publish(Map<PlaceSnapshot.Source, Long> runs, List<PlaceSnapshot.Collection> collections);
    void fail(Map<PlaceSnapshot.Source, Long> runs, String failureCode);
}
