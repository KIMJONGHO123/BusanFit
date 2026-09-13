package com.busanfit.global.external.tourapi;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "external.public-data")
public record TourApiProperties(
        String serviceKey,
        String baseUrl,
        String keywordSearchPath,
        String areaSearchPath,
        Duration timeout
) {
    public TourApiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://apis.data.go.kr/B551011/KorService2";
        }
        if (keywordSearchPath == null || keywordSearchPath.isBlank()) {
            keywordSearchPath = "/searchKeyword2";
        }
        if (areaSearchPath == null || areaSearchPath.isBlank()) {
            areaSearchPath = "/areaBasedList2";
        }
        if (timeout == null) {
            timeout = Duration.ofSeconds(5);
        }
    }
}
