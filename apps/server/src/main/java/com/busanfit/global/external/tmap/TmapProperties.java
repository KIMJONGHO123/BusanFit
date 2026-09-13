package com.busanfit.global.external.tmap;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "external.tmap")
public record TmapProperties(
        String appKey,
        String baseUrl,
        String carRoutePath,
        Duration timeout
) {
    public TmapProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://apis.openapi.sk.com/tmap";
        }
        if (carRoutePath == null || carRoutePath.isBlank()) {
            carRoutePath = "/routes";
        }
        if (timeout == null) {
            timeout = Duration.ofSeconds(5);
        }
    }
}
