package com.busanfit.planner;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.Arrays;

public enum ActivityType {
    CAFE("cafe", 40, false),
    MEAL("meal", 60, false),
    SHOPPING("shopping", 50, false),
    PHOTO("photo", 20, true),
    WALK("walk", 30, true),
    VIEWING("viewing", 60, false),
    EXPERIENCE("experience", 90, false),
    NIGHT_VIEW("nightView", 30, true),
    REST("rest", 20, false),
    OTHER("other", 30, false);

    private final String requestValue;
    private final int minutes;
    private final boolean weatherSensitive;

    ActivityType(String requestValue, int minutes, boolean weatherSensitive) {
        this.requestValue = requestValue;
        this.minutes = minutes;
        this.weatherSensitive = weatherSensitive;
    }

    @JsonCreator
    public static ActivityType from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("활동 값은 비어 있을 수 없습니다.");
        }

        return Arrays.stream(values())
                .filter(activity -> activity.requestValue.equalsIgnoreCase(value)
                        || activity.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 활동입니다: " + value));
    }

    public String getRequestValue() {
        return requestValue;
    }

    public int getMinutes() {
        return minutes;
    }

    public boolean isWeatherSensitive() {
        return weatherSensitive;
    }
}
