package com.busanfit.place;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.JsonNode;

@Service
public class PlaceDetailService {
    public record Field(String label, String text, String source, String state, String checkedAt, boolean differs) { }
    public record Detail(String status, List<Field> fields) { }

    private final PlaceDetailRepository repository;

    public PlaceDetailService(PlaceDetailRepository repository) {
        this.repository = repository;
    }

    public Detail detail(String contentId, String name, String address, double latitude, double longitude) {
        return repository.find(contentId, name, address, latitude, longitude)
                .map(this::compose).orElseGet(() -> new Detail("NOT_COLLECTED", List.of()));
    }

    private Detail compose(PlaceDetailRepository.Sources sources) {
        var fields = new ArrayList<Field>();
        var tour = sources.tour();
        var busan = sources.busan();
        for (var item : tour.details().path("additionalInformation")) {
            String label = plain(item.path("name"));
            fields.add(field(tour, "additionalInformation", label.isEmpty() ? "추가 안내" : label,
                    plain(item.path("text")), "한국관광공사", false));
        }
        for (String[] field : List.of(new String[]{"hoursText", "운영시간"}, new String[]{"usageDays", "운영일"},
                new String[]{"closedDays", "휴무일"}, new String[]{"parking", "주차"},
                new String[]{"feesText", "이용요금"}, new String[]{"transport", "교통편"},
                new String[]{"facilities", "편의시설"}, new String[]{"description", "소개"})) {
            String key = field[0];
            String primary = plain(tour.details().path(key));
            String local = busan == null ? "" : plain(busan.details().path(key));
            boolean operating = List.of("hoursText", "usageDays", "closedDays").contains(key);
            boolean differs = operating && !primary.isEmpty() && !local.isEmpty() && !primary.equals(local);
            fields.add(field(tour, key, field[1], primary, "한국관광공사", differs));
            if (busan != null && (primary.isEmpty() || differs)) {
                fields.add(field(busan, key, field[1], local, "부산광역시", differs));
            }
        }
        boolean available = fields.stream().anyMatch(f -> !f.text().isEmpty());
        return new Detail(available ? "AVAILABLE" : "EMPTY", List.copyOf(fields));
    }

    private Field field(PlaceDetailRepository.Snapshot snapshot, String key, String label, String text,
                        String source, boolean differs) {
        JsonNode observation = snapshot.states().path(key);
        return new Field(label, text, source, observation.path("state").asText("UNKNOWN"),
                observation.path("checkedAt").asText(null), differs);
    }

    private static String plain(JsonNode value) {
        return value.isString() ? HtmlUtils.htmlUnescape(value.asText().replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("<[^>]+>", "")).strip() : "";
    }
}
