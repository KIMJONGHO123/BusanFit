package com.busanfit.place.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.busanfit.place.ingest.adapter.JdbcPlaceImportStore;
import com.busanfit.place.ingest.adapter.LocalImportSettings;
import com.busanfit.place.ingest.adapter.PublicPlaceSource;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** All mutations are confined to an explicitly created disposable MySQL schema. */
@EnabledIfEnvironmentVariable(named = "BUSANFIT_PLACE_MYSQL_TEST", matches = "1")
class PlaceImportMySqlTest {
    private static LocalImportSettings settings;
    private static Connection connection;
    private static String schema;
    private JdbcPlaceImportStore store;

    @BeforeAll
    static void createIsolatedSchema() throws Exception {
        settings = new LocalImportSettings();
        connection = settings.connect();
        assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("MySQL");
        schema = "busanfit_task016_test_" + UUID.randomUUID().toString().replace("-", "");
        sql("CREATE DATABASE `" + schema + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin");
        connection.setCatalog(schema);
        var migration = new JdbcPlaceImportStore(connection, Clock.systemUTC());
        migration.migrate();
        migration.migrate();
    }

    @AfterAll
    static void removeOwnSchema() throws Exception {
        if (connection != null) {
            if (schema != null && schema.matches("busanfit_task016_test_[a-f0-9]{32}")) {
                sql("DROP DATABASE `" + schema + "`");
            }
            connection.close();
        }
    }

    @BeforeEach
    void resetOwnTables() throws Exception {
        for (String table : List.of("place_link_review", "place_link", "tourapi_place", "busan_attraction", "place_import_run")) {
            sql("DELETE FROM " + table);
        }
        store = new JdbcPlaceImportStore(connection, Clock.systemUTC());
        seed("처음 이름");
    }

    @Test
    void migrationAndRepeatedImportPreserveIdsVersionsAndSemanticValues() throws Exception {
        assertThat(number("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()"))
                .isEqualTo(5);
        seed("처음 이름");
        assertThat(number("SELECT COUNT(*) FROM tourapi_place")).isEqualTo(2);
        assertThat(number("SELECT data_version FROM tourapi_place WHERE content_id='1'")).isEqualTo(1);
        assertThat(value("SELECT JSON_UNQUOTE(JSON_EXTRACT(details,'$.feesText')) FROM tourapi_place WHERE content_id='1'"))
                .isEqualTo("무료");
        assertThat(number("SELECT COUNT(*) FROM place_import_run WHERE status='SUCCEEDED'")).isEqualTo(4);
    }

    @Test
    void malformedZeroCountDetailPreservesPublishedInformationAndSuccessTime() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var malformed = new java.util.concurrent.atomic.AtomicBoolean();
        server.createContext("/", exchange -> {
            String items = switch (exchange.getRequestURI().getPath()) {
                case "/areaBasedList2", "/detailCommon2" ->
                        "{\"item\":[{\"contentid\":\"1\",\"contenttypeid\":\"12\",\"lDongRegnCd\":\"26\"}]}";
                case "/detailIntro2" -> "{\"item\":[{\"contentid\":\"1\"}]}";
                case "/detailInfo2" -> malformed.get() ? "{\"unexpected\":\"error\"}"
                        : "{\"item\":[{\"contentid\":\"1\",\"serialnum\":\"0\",\"infotext\":\"previous value\"}]}";
                default -> throw new AssertionError("Unexpected endpoint");
            };
            int total = items.contains("\"unexpected\"") ? 0 : 1;
            byte[] body = """
                    {"response":{"header":{"resultCode":"0000"},"body":{"pageNo":1,"totalCount":%d,"items":%s}}}
                    """.formatted(total, items).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            String base = "http://127.0.0.1:" + server.getAddress().getPort();
            var source = new PublicPlaceSource(base, base, "test", "test", Clock.systemUTC());
            var service = new PlaceImportService(provider -> provider == PlaceSnapshot.Source.TOURAPI
                    ? source.collect(provider) : PlaceImportServiceTest.collection(provider, "11", "Busan"), store);
            service.execute();
            String query = """
                    SELECT JSON_ARRAY(details->'$.additionalInformation', field_status->'$.additionalInformation',
                                      last_checked_at, last_success_run_id) FROM tourapi_place WHERE content_id='1'
                    """;
            String published = value(query);
            assertThat(published).contains("previous value", "VALUE", "checkedAt");
            malformed.set(true);
            assertThatThrownBy(service::execute).hasMessageContaining("PLACE_IMPORT_FAILED");
            assertThat(value(query)).isEqualTo(published);
            assertThat(number("SELECT COUNT(*) FROM place_import_run WHERE status='FAILED'")).isEqualTo(2);
        } finally {
            server.stop(0);
        }
    }

    @Test
    void foreignKeysAndUniqueConstraintsRejectInvalidAndDuplicateLinks() throws Exception {
        assertThatThrownBy(() -> sql(link("404", "11"))).isInstanceOf(SQLException.class);
        sql(link("1", "11"));
        assertThatThrownBy(() -> sql(link("2", "11"))).isInstanceOf(SQLException.class);
        assertThatThrownBy(() -> sql("DELETE FROM busan_attraction WHERE uc_seq='11'"))
                .isInstanceOf(SQLException.class);
    }

    @Test
    void jsonObjectKeyOrderAndObservationTimeDoNotCreateFalseDataVersions() throws Exception {
        var original = PlaceImportServiceTest.snapshot("1", "처음 이름");
        var firstDetails = new java.util.LinkedHashMap<String, Object>();
        firstDetails.put("feesText", "무료");
        firstDetails.put("other", java.util.Map.of("b", 2, "a", 1));
        var secondDetails = new java.util.LinkedHashMap<String, Object>();
        secondDetails.put("other", java.util.Map.of("a", 1, "b", 2));
        secondDetails.put("feesText", "무료");
        for (var details : List.of(firstDetails, secondDetails)) {
            var place = new PlaceSnapshot(original.externalId(), original.name(), original.address(), original.regionCode(),
                    original.latitude(), original.longitude(), null, java.time.Instant.now(), details, original.fieldStatus());
            store.publish(store.begin(), List.of(new PlaceSnapshot.Collection(PlaceSnapshot.Source.TOURAPI,
                            List.of(place), 1, 1), PlaceImportServiceTest.collection(PlaceSnapshot.Source.BUSAN, "11", "부산 정보")));
        }
        assertThat(number("SELECT data_version FROM tourapi_place WHERE content_id='1'")).isEqualTo(2);
    }

    @Test
    void independentConcurrentApprovalsCanOnlyCommitOneOwner() throws Exception {
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> concurrentLink("1", ready, start));
            var second = pool.submit(() -> concurrentLink("2", ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
        assertThat(number("SELECT COUNT(*) FROM place_link")).isEqualTo(1);
    }

    @Test
    void changedMatchingEvidenceInvalidatesLinkAndPreservesOldEvidenceAtomically() throws Exception {
        sql(link("1", "11"));
        seed("바뀐 이름");
        assertThat(value("SELECT status FROM place_link WHERE content_id='1'")).isEqualTo("REVIEW_REQUIRED");
        assertThat(number("SELECT data_version FROM tourapi_place WHERE content_id='1'")).isEqualTo(2);
        assertThat(value("SELECT evidence FROM place_link_review LIMIT 1")).contains("처음 이름", "바뀐 이름");
        sql("DELETE FROM place_link WHERE content_id='1'");
        assertThat(number("SELECT COUNT(*) FROM place_link_review")).isEqualTo(1);
    }

    @Test
    void failedPublicationRollsBackSourceChangesAndLinkInvalidation() throws Exception {
        sql(link("1", "11"));
        var runs = store.begin();
        var invalidRuns = new EnumMap<>(runs);
        invalidRuns.put(PlaceSnapshot.Source.BUSAN, Long.MAX_VALUE);
        assertThatThrownBy(() -> store.publish(invalidRuns, collections("바뀐 이름")))
                .hasMessageContaining("PUBLICATION_FAILED");
        store.fail(runs, "EXPECTED_TEST_FAILURE");
        assertThat(value("SELECT name FROM tourapi_place WHERE content_id='1'")).isEqualTo("처음 이름");
        assertThat(value("SELECT status FROM place_link WHERE content_id='1'")).isEqualTo("CONNECTED");
        assertThat(number("SELECT COUNT(*) FROM place_link_review")).isZero();
        assertThat(number("SELECT COUNT(*) FROM place_import_run WHERE status='FAILED'")).isEqualTo(2);
    }

    @Test
    void initialLinkScriptRollsBackBothInsertsEvenIfClientContinuesAfterError() throws Exception {
        sql("""
                UPDATE tourapi_place SET content_id='2456767',name='F1963',
                matching_hash='d27e5a548717df47d555948d73a7278a4d51cf2a9cc01b6a75ddc020a2b17bef'
                WHERE content_id='1'
                """);
        sql("""
                UPDATE busan_attraction SET uc_seq='372',name='F1963',
                matching_hash='8ceb4320b5eb8487d359f4aa98f120335c20c1dd4b0a78a0be0353708d5c75ab'
                WHERE uc_seq='11'
                """);
        String script;
        try (var resource = getClass().getResourceAsStream("/db/manual/TASK017-connect-place-details.sql")) {
            script = new String(java.util.Objects.requireNonNull(resource).readAllBytes(), StandardCharsets.UTF_8);
        }
        // JDBC sends complete stored routines directly; DELIMITER is mysql client syntax.
        var statements = script.lines().filter(line -> !line.startsWith("DELIMITER"))
                .collect(java.util.stream.Collectors.joining("\n")).split(java.util.regex.Pattern.quote("$$"));
        sql("CREATE TRIGGER reject_link_review BEFORE INSERT ON place_link_review FOR EACH ROW "
                + "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='injected review failure'");
        boolean reachedCall = false;
        for (var statement : statements) {
            if (statement.stripLeading().startsWith("CALL ")) {
                assertThatThrownBy(() -> sql(statement)).isInstanceOf(SQLException.class)
                        .hasMessageContaining("injected review failure");
                reachedCall = true;
                sql("COMMIT");
            } else if (!statement.isBlank()) {
                sql(statement);
            }
        }
        assertThat(reachedCall).isTrue();
        assertThat(number("SELECT COUNT(*) FROM place_link")).isZero();
        assertThat(number("SELECT COUNT(*) FROM place_link_review")).isZero();
        assertThat(number("SELECT IS_FREE_LOCK('busanfit_task016_import')")).isEqualTo(1);
        sql("DROP TRIGGER reject_link_review");
        for (var statement : statements) {
            if (!statement.isBlank()) {
                sql(statement);
            }
        }
        assertThat(number("SELECT COUNT(*) FROM place_link")).isEqualTo(1);
        assertThat(number("SELECT COUNT(*) FROM place_link_review")).isEqualTo(1);
    }

    @Test
    void linkAndApprovalHistoryRollbackTogetherWhenHistoryInsertFails() throws Exception {
        connection.setAutoCommit(false);
        try {
            sql(link("1", "11"));
            assertThatThrownBy(() -> sql("""
                    INSERT INTO place_link_review(content_id,uc_seq,event_type,tour_data_version,busan_data_version,
                    criteria_version,evidence,reviewed_by,reviewed_at,reason)
                    VALUES ('1','404','APPROVED',1,1,'test',JSON_OBJECT(),'test',UTC_TIMESTAMP(6),'test')
                    """)).isInstanceOf(SQLException.class);
            connection.rollback();
        } finally {
            connection.setAutoCommit(true);
        }
        assertThat(number("SELECT COUNT(*) FROM place_link")).isZero();
        assertThat(number("SELECT COUNT(*) FROM place_link_review")).isZero();
    }

    private boolean concurrentLink(String id, CountDownLatch ready, CountDownLatch start) throws Exception {
        try (var other = settings.connect()) {
            other.setCatalog(schema);
            other.setAutoCommit(false);
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("TEST_START_TIMEOUT");
            }
            try (var statement = other.createStatement()) {
                statement.execute(link(id, "11"));
                other.commit();
                return true;
            } catch (SQLException expectedConflict) {
                other.rollback();
                assertThat(expectedConflict.getSQLState()).startsWith("23");
                return false;
            }
        }
    }

    private void seed(String name) {
        store.publish(store.begin(), collections(name));
    }

    private List<PlaceSnapshot.Collection> collections(String name) {
        return List.of(new PlaceSnapshot.Collection(PlaceSnapshot.Source.TOURAPI,
                        List.of(PlaceImportServiceTest.snapshot("1", name), PlaceImportServiceTest.snapshot("2", "다른 장소")), 1, 2),
                PlaceImportServiceTest.collection(PlaceSnapshot.Source.BUSAN, "11", "부산 정보"));
    }

    private static String link(String id, String ucSeq) {
        return "INSERT INTO place_link(content_id,uc_seq,status,link_method,tour_data_version,busan_data_version,"
                + "criteria_version,evidence,checked_at) VALUES ('" + id + "','" + ucSeq
                + "','CONNECTED','MANUAL',1,1,'test',JSON_OBJECT(),UTC_TIMESTAMP(6))";
    }

    private static void sql(String sql) throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private long number(String sql) throws SQLException {
        return Long.parseLong(value(sql));
    }

    private String value(String sql) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(sql)) {
            assertThat(rows.next()).isTrue();
            return rows.getString(1);
        }
    }
}
