package com.busanfit.place;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.junit.jupiter.api.AfterEach;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceDetailControllerTest {
    private static final String STATES = """
            {"hoursText":{"state":"VALUE","checkedAt":"2026-11-03T01:00:00Z"}}
            """;
    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private PlaceDetailController controller;

    @BeforeEach
    void setup() {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build();
        jdbc = new JdbcTemplate(database);
        jdbc.execute("CREATE TABLE tourapi_place(content_id VARCHAR, name VARCHAR, address VARCHAR, "
                + "latitude DOUBLE, longitude DOUBLE, region_code VARCHAR, details VARCHAR, field_status VARCHAR)");
        jdbc.execute("CREATE TABLE place_link(content_id VARCHAR, uc_seq VARCHAR, status VARCHAR)");
        jdbc.execute("CREATE TABLE busan_attraction(uc_seq VARCHAR, region_code VARCHAR, details VARCHAR, field_status VARCHAR)");
        jdbc.update("INSERT INTO tourapi_place VALUES ('1','name','address',35,129,'26',?,?)",
                "{\"hoursText\":\"09–18\",\"parking\":\"유료\"}", STATES);
        jdbc.update("INSERT INTO busan_attraction VALUES ('2','26',?,?)",
                "{\"hoursText\":\"09–17\",\"feesText\":\"무료\",\"parking\":\"다른 문구\"}", STATES);
        jdbc.update("INSERT INTO place_link VALUES ('1','2','CONNECTED')");
        controller = new PlaceDetailController(new PlaceDetailService(new PlaceDetailRepository(jdbc, new ObjectMapper())));
    }

    @AfterEach
    void close() {
        database.shutdown();
    }

    @Test
    void connectedPlacePreservesOperatingSourcesAndSupplementsMissingFields() {
        var fields = controller.detail("1", "name", "address", 35, 129);
        assertThat(fields.status()).isEqualTo("AVAILABLE");
        assertThat(fields.fields()).filteredOn(f -> !f.text().isEmpty()).extracting(PlaceDetailService.Field::text)
                .containsExactly("09–18", "09–17", "유료", "무료");
        assertThat(fields.fields()).filteredOn(PlaceDetailService.Field::differs).hasSize(2)
                .allMatch(f -> f.label().equals("운영시간") && f.state().equals("VALUE")
                        && "2026-11-03T01:00:00Z".equals(f.checkedAt()));
    }

    @Test
    void distinguishesAbsentRecordFromCollectedEmptyValues() {
        jdbc.update("DELETE FROM place_link");
        jdbc.update("UPDATE tourapi_place SET details='{}', field_status=?",
                "{\"hoursText\":{\"state\":\"EMPTY\",\"checkedAt\":\"2026-11-03T01:00:00Z\"}}");
        var result = controller.detail("1", "name", "address", 35, 129);
        assertThat(result.status()).isEqualTo("EMPTY");
        assertThat(result.fields()).filteredOn(f -> f.label().equals("운영시간")).singleElement()
                .satisfies(f -> assertThat(f.state()).isEqualTo("EMPTY"));
        assertThat(controller.detail("9", "name", "address", 35, 129).status()).isEqualTo("NOT_COLLECTED");
    }

    @Test
    void changedEvidenceOrInactiveLinkSuppressesOnlyBusanFields() {
        assertThat(controller.detail("1", "changed", "address", 35, 129).fields())
                .allMatch(field -> field.source().equals("한국관광공사"));
        jdbc.update("UPDATE place_link SET status='REVIEW_REQUIRED'");
        assertThat(controller.detail("1", "name", "address", 35, 129).fields())
                .allMatch(field -> field.source().equals("한국관광공사"));
        assertThat(controller.detail("9", "name", "address", 35, 129).fields()).isEmpty();
    }
}
