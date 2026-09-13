package com.busanfit.global.external.tmap;

import static org.assertj.core.api.Assertions.assertThat;

import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

class TmapClientLiveTest {

    @Test
    @EnabledIfEnvironmentVariable(named = "TMAP_APP_KEY", matches = ".+")
    void getCarRouteCallsRealTmapApiWhenAppKeyExists() {
        TmapClient tmapClient = new TmapClient(
                RestClient.builder()
                        .baseUrl("https://apis.openapi.sk.com/tmap")
                        .build(),
                new TmapProperties(
                        System.getenv("TMAP_APP_KEY"),
                        "https://apis.openapi.sk.com/tmap",
                        "/routes",
                        Duration.ofSeconds(10)
                )
        );

        // 부산역 -> 감천문화마을 좌표입니다. 실제 호출 테스트는 환경변수 TMAP_APP_KEY가 있을 때만 실행됩니다.
        TmapCarRouteResult result = tmapClient.getCarRoute(
                35.1151,
                129.0414,
                35.0975,
                129.0106
        );

        assertThat(result.totalTimeSeconds()).isPositive();
        assertThat(result.totalTimeMinutes()).isPositive();
        assertThat(result.totalDistanceMeters()).isPositive();
        assertThat(result.rawResponse()).isNotBlank();
    }
}
