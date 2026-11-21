package com.busanfit.place.ingest;

import java.util.ArrayList;
import java.util.List;

public final class PlaceImportService {
    private final PlaceSource source;
    private final PlaceImportStore store;

    public PlaceImportService(PlaceSource source, PlaceImportStore store) {
        this.source = source;
        this.store = store;
    }

    public List<PlaceSnapshot.Collection> execute() {
        var runs = store.begin();
        try {
            var collections = new ArrayList<PlaceSnapshot.Collection>();
            for (var provider : PlaceSnapshot.Source.values()) {
                var collection = source.collect(provider);
                if (collection.source() != provider || collection.expectedCount() == 0) {
                    throw new IllegalStateException("EMPTY_OR_WRONG_SOURCE_COLLECTION");
                }
                collections.add(collection);
            }
            store.publish(runs, collections);
            return List.copyOf(collections);
        } catch (RuntimeException failure) {
            // Never persist exception text: upstream errors can contain authentication URLs.
            store.fail(runs, "COLLECTION_OR_PUBLICATION_FAILED");
            throw new IllegalStateException("PLACE_IMPORT_FAILED; existing published data preserved");
        }
    }
}
