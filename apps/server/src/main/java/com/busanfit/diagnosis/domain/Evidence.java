package com.busanfit.diagnosis.domain;

import java.time.OffsetDateTime;

/** A value is usable only when its source and confirmation time are known. */
public record Evidence<T>(T value, String source, OffsetDateTime checkedAt, String limitation) {
    public Evidence {
        if (source == null || source.isBlank()
                || (value != null && (checkedAt == null || limitation != null))
                || (value == null && (limitation == null || limitation.isBlank()))) {
            throw new IllegalArgumentException("근거의 출처·확인시각 또는 확인 불가 이유가 필요합니다.");
        }
    }

    public static <T> Evidence<T> known(T value, String source, OffsetDateTime checkedAt) {
        if (value == null) {
            throw new IllegalArgumentException("확인된 값이 필요합니다.");
        }
        return new Evidence<>(value, source, checkedAt, null);
    }

    public static <T> Evidence<T> unavailable(String source, OffsetDateTime checkedAt, String reason) {
        return new Evidence<>(null, source, checkedAt, reason);
    }

    public boolean confirmed() {
        return value != null;
    }
}
