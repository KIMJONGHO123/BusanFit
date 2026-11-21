package com.busanfit.place.ingest.adapter;

import com.busanfit.place.ingest.PlaceSnapshot;
import com.busanfit.place.ingest.PlaceSource;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public final class PublicPlaceSource implements PlaceSource {
    private static final int PAGE_SIZE = 100;
    private static final Set<String> DISTRICTS = Set.of("중구", "서구", "동구", "영도구", "부산진구", "동래구",
            "남구", "북구", "해운대구", "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군");
    private final HttpClient client;
    private final String tourBase;
    private final String busanBase;
    private final String tourKey;
    private final String busanKey;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    public PublicPlaceSource(String tourBase, String busanBase, String tourKey, String busanKey, Clock clock) {
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        this.tourBase = tourBase;
        this.busanBase = busanBase;
        this.tourKey = tourKey;
        this.busanKey = busanKey;
        this.clock = clock;
    }

    @Override
    public PlaceSnapshot.Collection collect(PlaceSnapshot.Source source) {
        return source == PlaceSnapshot.Source.TOURAPI ? collectTour() : collectBusan();
    }

    private PlaceSnapshot.Collection collectTour() {
        var listing = pages(tourBase, "/areaBasedList2", tourKey,
                Map.of("lDongRegnCd", "26", "contentTypeId", "12", "arrange", "C"), false, "contentid");
        var places = new ArrayList<PlaceSnapshot>();
        for (var listed : listing.items()) {
            String id = requiredId(listed, "contentid");
            require("26".equals(text(listed, "lDongRegnCd")) && "12".equals(text(listed, "contenttypeid")),
                    "UNEXPECTED_TOUR_SCOPE");
            var commonPage = pages(tourBase, "/detailCommon2", tourKey, Map.of("contentId", id), false, "contentid");
            require(commonPage.items().size() == 1, "MISSING_TOUR_COMMON");
            var common = commonPage.items().getFirst();
            require(id.equals(requiredId(common, "contentid")) && "26".equals(text(common, "lDongRegnCd"))
                    && "12".equals(text(common, "contenttypeid")), "CHANGED_TOUR_ID_OR_SCOPE");
            var introPage = pages(tourBase, "/detailIntro2", tourKey,
                    Map.of("contentId", id, "contentTypeId", "12"), false, "contentid");
            require(introPage.items().size() <= 1, "MULTIPLE_TOUR_INTRO");
            JsonNode intro = introPage.items().isEmpty() ? mapper.createObjectNode() : introPage.items().getFirst();
            if (!introPage.items().isEmpty()) {
                require(id.equals(requiredId(intro, "contentid")), "WRONG_TOUR_INTRO_ID");
            }
            var info = pages(tourBase, "/detailInfo2", tourKey,
                    Map.of("contentId", id, "contentTypeId", "12"), false, "serialnum");
            var fields = new Fields(Instant.now(clock));
            String name = fields.string(common, "title", "name", "detailCommon2");
            String address = fields.string(common, "addr1", "address", "detailCommon2");
            Double latitude = fields.coordinate(common, "mapy", "latitude", 90, "detailCommon2");
            Double longitude = fields.coordinate(common, "mapx", "longitude", 180, "detailCommon2");
            fields.detail(common, "addr2", "addressDetail", "detailCommon2");
            fields.detail(common, "overview", "description", "detailCommon2");
            fields.detail(common, "homepage", "homepage", "detailCommon2");
            fields.detail(common, "tel", "telephone", "detailCommon2");
            fields.detail(common, "telname", "telephoneName", "detailCommon2");
            fields.detail(common, "firstimage", "imageUrl", "detailCommon2");
            fields.detail(common, "firstimage2", "thumbnailUrl", "detailCommon2");
            fields.detail(common, "cpyrhtDivCd", "imageCopyrightCode", "detailCommon2");
            fields.detail(common, "zipcode", "postalCode", "detailCommon2");
            fields.detail(common, "lDongSignguCd", "districtCode", "detailCommon2");
            String[][] introFields = {{"infocenter", "informationTelephone"}, {"opendate", "openingDate"},
                    {"restdate", "closedDays"}, {"usetime", "hoursText"}, {"useseason", "seasonText"},
                    {"expguide", "experienceGuide"}, {"expagerange", "experienceAge"}, {"accomcount", "capacity"},
                    {"parking", "parking"}, {"chkbabycarriage", "babyCarriage"}, {"chkpet", "pets"},
                    {"chkcreditcard", "creditCards"}, {"heritage1", "heritage1"}, {"heritage2", "heritage2"},
                    {"heritage3", "heritage3"}};
            for (var field : introFields) {
                fields.detail(intro, field[0], field[1], "detailIntro2");
            }
            var additional = new ArrayList<Map<String, String>>();
            for (var item : info.items()) {
                require(id.equals(requiredId(item, "contentid")), "WRONG_TOUR_INFO_ID");
                additional.add(Map.of("name", text(item, "infoname"), "text", text(item, "infotext"),
                        "serial", text(item, "serialnum")));
            }
            fields.details.put("additionalInformation", additional);
            fields.status("additionalInformation", additional.isEmpty() ? "EMPTY" : "VALUE", "detailInfo2");
            fields.status("regionCode", "VALUE", "detailCommon2");
            places.add(new PlaceSnapshot(id, name, address, "26", latitude, longitude,
                    text(common, "modifiedtime"), fields.checkedAt, fields.details, fields.states));
            if (places.size() % 25 == 0) {
                System.out.println("Collected TOURAPI " + places.size() + "/" + listing.items().size());
            }
        }
        return new PlaceSnapshot.Collection(PlaceSnapshot.Source.TOURAPI, places, listing.pages(), listing.items().size());
    }

    private PlaceSnapshot.Collection collectBusan() {
        var listing = pages(busanBase, "/getAttractionKr", busanKey, Map.of(), true, "UC_SEQ");
        var places = new ArrayList<PlaceSnapshot>();
        for (var item : listing.items()) {
            var fields = new Fields(Instant.now(clock));
            String id = requiredId(item, "UC_SEQ");
            String name = fields.string(item, "MAIN_TITLE", "name", "getAttractionKr");
            String address = fields.string(item, "ADDR1", "address", "getAttractionKr");
            Double latitude = fields.coordinate(item, "LAT", "latitude", 90, "getAttractionKr");
            Double longitude = fields.coordinate(item, "LNG", "longitude", 180, "getAttractionKr");
            String district = fields.string(item, "GUGUN_NM", "district", "getAttractionKr");
            fields.details.put("district", district);
            String[][] supplemental = {{"PLACE", "placeLabel"}, {"TITLE", "title"}, {"SUBTITLE", "subtitle"},
                    {"CNTCT_TEL", "telephone"}, {"HOMEPAGE_URL", "homepage"}, {"TRFC_INFO", "transport"},
                    {"USAGE_DAY", "usageDays"}, {"HLDY_INFO", "closedDays"}, {"USAGE_DAY_WEEK_AND_TIME", "hoursText"},
                    {"USAGE_AMOUNT", "feesText"}, {"MIDDLE_SIZE_RM1", "facilities"}, {"MAIN_IMG_NORMAL", "imageUrl"},
                    {"MAIN_IMG_THUMB", "thumbnailUrl"}, {"ITEMCNTNTS", "description"}};
            for (var field : supplemental) {
                fields.detail(item, field[0], field[1], "getAttractionKr");
            }
            String region = district != null && DISTRICTS.contains(district) ? "26" : null;
            fields.status("regionCode", region == null ? "MISSING" : "VALUE", "getAttractionKr + district");
            places.add(new PlaceSnapshot(id, name, address, region, latitude, longitude,
                    null, fields.checkedAt, fields.details, fields.states));
        }
        return new PlaceSnapshot.Collection(PlaceSnapshot.Source.BUSAN, places, listing.pages(), listing.items().size());
    }

    private Pages pages(String base, String path, String key, Map<String, String> parameters,
                        boolean busan, String uniqueField) {
        var all = new ArrayList<JsonNode>();
        var seen = new java.util.HashSet<String>();
        int expected = -1;
        int page = 1;
        while (true) {
            var params = new java.util.TreeMap<>(parameters);
            params.put("serviceKey", key);
            params.put("pageNo", Integer.toString(page));
            params.put("numOfRows", Integer.toString(PAGE_SIZE));
            if (busan) {
                params.put("resultType", "json");
            } else {
                params.put("MobileOS", "ETC");
                params.put("MobileApp", "BusanFit");
                params.put("_type", "json");
            }
            JsonNode root = request(base + path, params);
            JsonNode body = busan ? root.path("getAttractionKr") : root.path("response").path("body");
            String code = busan ? body.path("header").path("code").asText()
                    : root.path("response").path("header").path("resultCode").asText();
            require((busan ? "00" : "0000").equals(code), "UPSTREAM_REJECTED");
            int total = integer(body.path("totalCount"));
            require(total <= 10000 && (expected < 0 || total == expected), "CHANGED_OR_EXCESSIVE_TOTAL");
            expected = total;
            require(integer(body.path("pageNo")) == page, "WRONG_PAGE");
            if (!busan && total == 0) {
                // TourAPI represents zero records with an empty string in body.items.
                JsonNode items = body.path("items");
                require(items.isString() && items.asText().isEmpty(), "INVALID_EMPTY_TOUR_ITEMS");
                return new Pages(List.of(), page);
            }
            JsonNode rows = busan ? body.path("item") : body.path("items").path("item");
            var current = new ArrayList<JsonNode>();
            if (rows.isArray()) {
                rows.forEach(current::add);
            } else if (rows.isObject()) {
                current.add(rows);
            } else {
                require(total == 0 && (rows.isMissingNode() || rows.isNull()
                        || rows.isString() && rows.asText().isBlank()), "MISSING_ITEMS");
            }
            require(current.size() == Math.min(PAGE_SIZE, Math.max(0, expected - all.size())), "INCOMPLETE_PAGE");
            for (var row : current) {
                require(row.isObject() && seen.add(requiredId(row, uniqueField)), "DUPLICATE_ITEM");
                all.add(row);
            }
            if (all.size() == expected) {
                return new Pages(List.copyOf(all), page);
            }
            page++;
        }
    }

    private JsonNode request(String base, Map<String, String> parameters) {
        String query = parameters.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(java.util.stream.Collectors.joining("&"));
        try {
            var response = client.send(HttpRequest.newBuilder(URI.create(base + "?" + query))
                    .timeout(Duration.ofSeconds(30)).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
            require(response.statusCode() == 200, "UPSTREAM_HTTP_FAILURE");
            return mapper.readTree(new String(response.body(), StandardCharsets.UTF_8));
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("UPSTREAM_INTERRUPTED");
        } catch (Exception failure) {
            throw new IllegalStateException("UPSTREAM_REQUEST_OR_PARSE_FAILED");
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static int integer(JsonNode value) {
        require(value.asText().matches("[0-9]+"), "INVALID_COUNT");
        try {
            return Integer.parseInt(value.asText());
        } catch (NumberFormatException failure) {
            throw new IllegalStateException("INVALID_COUNT");
        }
    }

    private static String requiredId(JsonNode item, String name) {
        String id = text(item, name);
        require(id.matches("[0-9]+"), "INVALID_EXTERNAL_ID");
        return id;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNull() || value.isMissingNode() ? "" : value.asText().trim();
    }

    private static void require(boolean condition, String code) {
        if (!condition) {
            throw new IllegalStateException(code);
        }
    }

    private record Pages(List<JsonNode> items, int pages) { }

    private static final class Fields {
        private final Instant checkedAt;
        private final Map<String, Object> details = new LinkedHashMap<>();
        private final Map<String, Object> states = new LinkedHashMap<>();

        private Fields(Instant checkedAt) {
            this.checkedAt = checkedAt;
        }

        private void status(String field, String state, String endpoint) {
            states.put(field, Map.of("state", state, "checkedAt", checkedAt.toString(), "endpoint", endpoint));
        }

        private String string(JsonNode node, String source, String field, String endpoint) {
            JsonNode raw = node.path(source);
            String value = text(node, source);
            status(field, raw.isMissingNode() ? "MISSING" : value.isBlank() ? "EMPTY" : "VALUE", endpoint);
            return value.isBlank() ? null : value;
        }

        private void detail(JsonNode node, String source, String field, String endpoint) {
            details.put(field, string(node, source, field, endpoint));
        }

        private Double coordinate(JsonNode node, String source, String field, int limit, String endpoint) {
            String value = string(node, source, field, endpoint);
            if (value == null) {
                return null;
            }
            try {
                double coordinate = Double.parseDouble(value);
                if (Double.isFinite(coordinate) && Math.abs(coordinate) <= limit && coordinate != 0) {
                    return coordinate;
                }
            } catch (NumberFormatException ignored) {
                // The source record is retained, but invalid coordinates are never made usable.
            }
            status(field, "INVALID", endpoint);
            return null;
        }
    }
}
