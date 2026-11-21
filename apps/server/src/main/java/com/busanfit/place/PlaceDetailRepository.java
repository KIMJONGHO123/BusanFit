package com.busanfit.place;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Repository
public class PlaceDetailRepository {
    record Snapshot(JsonNode details, JsonNode states) { }
    record Sources(Snapshot tour, Snapshot busan) { }

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public PlaceDetailRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    Optional<Sources> find(String contentId, String name, String address, double latitude, double longitude) {
        return jdbc.query("""
                SELECT t.details AS tour, t.field_status AS tour_states,
                       b.details AS busan, b.field_status AS busan_states FROM tourapi_place t
                LEFT JOIN place_link l ON l.content_id=t.content_id AND l.status='CONNECTED'
                    AND t.region_code='26' AND t.name=? AND t.address=? AND t.address<>''
                    AND t.latitude=? AND t.longitude=?
                LEFT JOIN busan_attraction b ON b.uc_seq=l.uc_seq AND b.region_code='26'
                WHERE t.content_id=?
                """, rows -> {
            if (!rows.next()) {
                return Optional.empty();
            }
            Snapshot tour = snapshot(rows.getString("tour"), rows.getString("tour_states"));
            String local = rows.getString("busan");
            Snapshot busan = local == null ? null : snapshot(local, rows.getString("busan_states"));
            return Optional.of(new Sources(tour, busan));
        }, name, address, latitude, longitude, contentId);
    }

    private Snapshot snapshot(String details, String states) {
        return new Snapshot(mapper.readTree(details), mapper.readTree(states));
    }
}
