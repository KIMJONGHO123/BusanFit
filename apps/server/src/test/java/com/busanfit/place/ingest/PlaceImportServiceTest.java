package com.busanfit.place.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PlaceImportServiceTest {
    @Test
    void failureOfEitherSourceNeverPublishesCollectedPages() {
        var store = new RecordingStore();
        PlaceSource source = provider -> {
            if (provider == PlaceSnapshot.Source.BUSAN) {
                throw new IllegalStateException("upstream serviceKey=secret");
            }
            return collection(provider, "1", "장소");
        };
        assertThatThrownBy(() -> new PlaceImportService(source, store).execute())
                .hasMessageNotContaining("secret").hasMessageContaining("PLACE_IMPORT_FAILED");
        assertThat(store.published).isFalse();
        assertThat(store.failure).isEqualTo("COLLECTION_OR_PUBLICATION_FAILED");
    }

    @Test
    void bothCompleteSourcesArePublishedTogether() {
        var store = new RecordingStore();
        new PlaceImportService(provider -> collection(provider, "1", "장소"), store).execute();
        assertThat(store.published).isTrue();
        assertThat(store.failure).isNull();
    }

    @Test
    void emptyOrDuplicateCollectionCannotReplaceExistingData() {
        var store = new RecordingStore();
        assertThatThrownBy(() -> new PlaceImportService(provider ->
                new PlaceSnapshot.Collection(provider, List.of(), 1, 0), store).execute())
                .hasMessageContaining("PLACE_IMPORT_FAILED");
        assertThat(store.published).isFalse();
        var duplicate = snapshot("1", "장소");
        assertThatThrownBy(() -> new PlaceSnapshot.Collection(PlaceSnapshot.Source.BUSAN,
                List.of(duplicate, duplicate), 1, 2)).isInstanceOf(IllegalArgumentException.class);
    }

    static PlaceSnapshot snapshot(String id, String name) {
        return new PlaceSnapshot(id, name, "부산 중구", "26", 35.1, 129.1, null,
                Instant.parse("2026-11-03T01:00:00Z"), Map.of("feesText", "무료"),
                Map.of("feesText", Map.of("state", "VALUE", "checkedAt", "2026-11-03T01:00:00Z")));
    }

    static PlaceSnapshot.Collection collection(PlaceSnapshot.Source source, String id, String name) {
        return new PlaceSnapshot.Collection(source, List.of(snapshot(id, name)), 1, 1);
    }

    private static final class RecordingStore implements PlaceImportStore {
        private boolean published;
        private String failure;

        @Override
        public Map<PlaceSnapshot.Source, Long> begin() {
            return Map.of(PlaceSnapshot.Source.TOURAPI, 1L, PlaceSnapshot.Source.BUSAN, 2L);
        }

        @Override
        public void publish(Map<PlaceSnapshot.Source, Long> runs, List<PlaceSnapshot.Collection> collections) {
            assertThat(collections).hasSize(2);
            published = true;
        }

        @Override
        public void fail(Map<PlaceSnapshot.Source, Long> runs, String failureCode) {
            failure = failureCode;
        }
    }
}
