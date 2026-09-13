package com.busanfit.user;

public final class JsonTestUtils {

    private JsonTestUtils() {
    }

    public static String readString(String json, String fieldName) {
        String field = "\"" + fieldName + "\":\"";
        int fieldStart = json.indexOf(field);
        if (fieldStart < 0) {
            throw new IllegalArgumentException("JSON field not found: " + fieldName);
        }

        int valueStart = fieldStart + field.length();
        int valueEnd = json.indexOf("\"", valueStart);
        if (valueEnd < 0) {
            throw new IllegalArgumentException("JSON string value is not closed: " + fieldName);
        }

        return json.substring(valueStart, valueEnd);
    }
}
