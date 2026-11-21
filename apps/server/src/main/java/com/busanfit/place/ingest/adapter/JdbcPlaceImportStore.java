package com.busanfit.place.ingest.adapter;

import com.busanfit.place.ingest.PlaceImportStore;
import com.busanfit.place.ingest.PlaceSnapshot;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

public final class JdbcPlaceImportStore implements PlaceImportStore {
    private final Connection connection;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    public JdbcPlaceImportStore(Connection connection, Clock clock) {
        this.connection = connection;
        this.clock = clock;
    }

    public void migrate() {
        try (var stream = JdbcPlaceImportStore.class.getResourceAsStream("/db/manual/TASK016-V1-place-import.sql")) {
            if (stream == null) {
                throw new IllegalStateException("MIGRATION_RESOURCE_MISSING");
            }
            String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            try (var statement = connection.createStatement()) {
                for (String command : sql.replaceAll("(?m)^--.*$", "").split(";")) {
                    if (!command.isBlank()) {
                        statement.execute(command);
                    }
                }
            }
        } catch (Exception failure) {
            throw new IllegalStateException("PLACE_SCHEMA_MIGRATION_FAILED");
        }
    }

    public void acquireLock() {
        try (var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT GET_LOCK('busanfit_task016_import', 0)")) {
            if (!rows.next() || rows.getInt(1) != 1) {
                throw new IllegalStateException("ANOTHER_IMPORT_IS_RUNNING");
            }
        } catch (SQLException failure) {
            throw new IllegalStateException("IMPORT_LOCK_FAILED");
        }
    }

    @Override
    public Map<PlaceSnapshot.Source, Long> begin() {
        var ids = new EnumMap<PlaceSnapshot.Source, Long>(PlaceSnapshot.Source.class);
        try {
            connection.setAutoCommit(false);
            for (var source : PlaceSnapshot.Source.values()) {
                try (var statement = connection.prepareStatement("""
                        INSERT INTO place_import_run(schema_tag,source,scope_description,status,started_at)
                        VALUES ('TASK016_V1',?,?,'COLLECTING',?)
                        """, Statement.RETURN_GENERATED_KEYS)) {
                    statement.setString(1, source.name());
                    statement.setString(2, source == PlaceSnapshot.Source.TOURAPI
                            ? "lDongRegnCd=26;contentTypeId=12;common+intro+info" : "getAttractionKr;all pages");
                    statement.setTimestamp(3, Timestamp.from(Instant.now(clock)));
                    statement.executeUpdate();
                    try (var keys = statement.getGeneratedKeys()) {
                        if (!keys.next()) {
                            throw new SQLException("MISSING_GENERATED_KEY");
                        }
                        ids.put(source, keys.getLong(1));
                    }
                }
            }
            connection.commit();
            return ids;
        } catch (SQLException failure) {
            rollback();
            throw new IllegalStateException("IMPORT_START_FAILED");
        } finally {
            autoCommit();
        }
    }

    @Override
    public void publish(Map<PlaceSnapshot.Source, Long> runs, List<PlaceSnapshot.Collection> collections) {
        if (runs.size() != 2 || collections.size() != 2
                || collections.stream().map(PlaceSnapshot.Collection::source).distinct().count() != 2) {
            throw new IllegalArgumentException("BOTH_COMPLETE_SOURCES_REQUIRED");
        }
        try {
            connection.setAutoCommit(false);
            for (var collection : collections) {
                for (var place : collection.places().stream()
                        .sorted(java.util.Comparator.comparing(PlaceSnapshot::externalId)).toList()) {
                    save(collection.source(), runs.get(collection.source()), place);
                }
                try (var statement = connection.prepareStatement("""
                        UPDATE place_import_run SET status='SUCCEEDED', completed_at=?, expected_count=?,
                        collected_count=?,page_count=? WHERE id=? AND source=? AND status='COLLECTING'
                        """)) {
                    statement.setTimestamp(1, Timestamp.from(Instant.now(clock)));
                    statement.setInt(2, collection.expectedCount());
                    statement.setInt(3, collection.places().size());
                    statement.setInt(4, collection.pages());
                    statement.setLong(5, runs.get(collection.source()));
                    statement.setString(6, collection.source().name());
                    if (statement.executeUpdate() != 1) {
                        throw new SQLException("RUN_STATE_CHANGED");
                    }
                }
            }
            connection.commit();
        } catch (Exception failure) {
            rollback();
            throw new IllegalStateException("IMPORT_PUBLICATION_FAILED");
        } finally {
            autoCommit();
        }
    }

    private void save(PlaceSnapshot.Source source, long runId, PlaceSnapshot place) throws Exception {
        String table = source == PlaceSnapshot.Source.TOURAPI ? "tourapi_place" : "busan_attraction";
        String idColumn = source == PlaceSnapshot.Source.TOURAPI ? "content_id" : "uc_seq";
        String matchingHash = digest(json(canonical(matchingValues(place))));
        String contentHash = digest(json(canonical(List.of(matchingValues(place), place.details(),
                place.sourceModifiedAt() == null ? "" : place.sourceModifiedAt(), statesWithoutTime(place.fieldStatus())))));
        invalidateChangedLink(source, place, matchingHash, table, idColumn);
        try (var statement = connection.prepareStatement("INSERT INTO " + table + " (" + idColumn + """
                ,name,address,region_code,latitude,longitude,source_modified_at,last_checked_at,
                last_success_run_id,data_version,content_hash,matching_hash,details,field_status)
                VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,?)
                ON DUPLICATE KEY UPDATE
                name=VALUES(name),address=VALUES(address),region_code=VALUES(region_code),
                latitude=VALUES(latitude),longitude=VALUES(longitude),source_modified_at=VALUES(source_modified_at),
                last_checked_at=VALUES(last_checked_at),last_success_run_id=VALUES(last_success_run_id),
                data_version=IF(content_hash=VALUES(content_hash),data_version,data_version+1),
                content_hash=VALUES(content_hash),matching_hash=VALUES(matching_hash),
                details=VALUES(details),field_status=VALUES(field_status)
                """)) {
            statement.setString(1, place.externalId());
            statement.setString(2, place.name());
            statement.setString(3, place.address());
            statement.setString(4, place.regionCode());
            statement.setObject(5, place.latitude());
            statement.setObject(6, place.longitude());
            statement.setString(7, place.sourceModifiedAt());
            statement.setTimestamp(8, Timestamp.from(place.checkedAt()));
            statement.setLong(9, runId);
            statement.setString(10, contentHash);
            statement.setString(11, matchingHash);
            statement.setString(12, json(place.details()));
            statement.setString(13, json(place.fieldStatus()));
            statement.executeUpdate();
        }
    }

    private void invalidateChangedLink(PlaceSnapshot.Source source, PlaceSnapshot place, String newHash,
                                       String table, String idColumn) throws SQLException {
        var oldEvidence = new LinkedHashMap<String, Object>();
        try (var statement = connection.prepareStatement("SELECT name,address,region_code,latitude,longitude,"
                + "matching_hash,data_version FROM " + table + " WHERE " + idColumn + "=? FOR UPDATE")) {
            statement.setString(1, place.externalId());
            try (var row = statement.executeQuery()) {
                if (!row.next() || newHash.equals(row.getString("matching_hash"))) {
                    return;
                }
                for (String column : List.of("name", "address", "region_code", "latitude", "longitude",
                        "matching_hash", "data_version")) {
                    oldEvidence.put(column, row.getObject(column));
                }
            }
        }
        String linkColumn = source == PlaceSnapshot.Source.TOURAPI ? "content_id" : "uc_seq";
        try (var statement = connection.prepareStatement("SELECT * FROM place_link WHERE " + linkColumn + "=? FOR UPDATE")) {
            statement.setString(1, place.externalId());
            try (var row = statement.executeQuery()) {
                if (!row.next()) {
                    return;
                }
                var evidence = new LinkedHashMap<String, Object>();
                evidence.put("previousSource", oldEvidence);
                evidence.put("newSource", matchingValues(place));
                evidence.put("previousLinkEvidence", mapper.readTree(row.getString("evidence")));
                try (var review = connection.prepareStatement("""
                        INSERT INTO place_link_review(content_id,uc_seq,event_type,tour_data_version,
                        busan_data_version,criteria_version,evidence,reviewed_by,reviewed_at,reason)
                        VALUES (?,?,'REVIEW_REQUIRED',?,?,?,?, 'IMPORT',?,'SOURCE_MATCHING_DATA_CHANGED')
                        """)) {
                    review.setString(1, row.getString("content_id"));
                    review.setString(2, row.getString("uc_seq"));
                    review.setLong(3, row.getLong("tour_data_version"));
                    review.setLong(4, row.getLong("busan_data_version"));
                    review.setString(5, row.getString("criteria_version"));
                    review.setString(6, json(evidence));
                    review.setTimestamp(7, Timestamp.from(Instant.now(clock)));
                    review.executeUpdate();
                }
                try (var update = connection.prepareStatement("UPDATE place_link SET status='REVIEW_REQUIRED',"
                        + "row_version=row_version+1 WHERE content_id=?")) {
                    update.setString(1, row.getString("content_id"));
                    update.executeUpdate();
                }
            }
        }
    }

    @Override
    public void fail(Map<PlaceSnapshot.Source, Long> runs, String failureCode) {
        try {
            connection.setAutoCommit(false);
            for (long runId : runs.values()) {
                try (var statement = connection.prepareStatement("UPDATE place_import_run SET status='FAILED',"
                        + "completed_at=?,failure_code=? WHERE id=? AND status='COLLECTING'")) {
                    statement.setTimestamp(1, Timestamp.from(Instant.now(clock)));
                    statement.setString(2, failureCode);
                    statement.setLong(3, runId);
                    statement.executeUpdate();
                }
            }
            connection.commit();
        } catch (SQLException failure) {
            rollback();
            throw new IllegalStateException("IMPORT_FAILURE_RECORD_FAILED");
        } finally {
            autoCommit();
        }
    }

    private Map<String, Object> matchingValues(PlaceSnapshot place) {
        var values = new LinkedHashMap<String, Object>();
        values.put("name", place.name());
        values.put("address", place.address());
        values.put("regionCode", place.regionCode());
        values.put("latitude", place.latitude());
        values.put("longitude", place.longitude());
        return values;
    }

    private Map<String, Object> statesWithoutTime(Map<String, Object> states) {
        var stable = new java.util.TreeMap<String, Object>();
        states.forEach((key, value) -> {
            if (value instanceof Map<?, ?> fields) {
                stable.put(key, fields.get("state"));
            }
        });
        return stable;
    }

    private String json(Object value) {
        return mapper.writeValueAsString(value);
    }

    private Object canonical(Object value) {
        if (value instanceof Map<?, ?> map) {
            var sorted = new java.util.TreeMap<String, Object>();
            map.forEach((key, item) -> sorted.put(String.valueOf(key), canonical(item)));
            return sorted;
        }
        if (value instanceof List<?> list) {
            return list.stream().map(this::canonical).toList();
        }
        return value;
    }

    private static String digest(String text) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
    }

    private void rollback() {
        try {
            connection.rollback();
        } catch (SQLException ignored) {
            throw new IllegalStateException("IMPORT_ROLLBACK_FAILED");
        }
    }

    private void autoCommit() {
        try {
            connection.setAutoCommit(true);
        } catch (SQLException ignored) {
            throw new IllegalStateException("IMPORT_CONNECTION_RESET_FAILED");
        }
    }
}
