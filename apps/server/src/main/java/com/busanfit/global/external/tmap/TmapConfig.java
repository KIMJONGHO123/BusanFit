package com.busanfit.global.external.tmap;

import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(TmapProperties.class)
public class TmapConfig {

    @Bean
    RestClient tmapRestClient(TmapProperties properties) {
        Duration timeout = properties.timeout();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);

        // Spring 기본 RestClient를 사용해서 별도 HTTP 라이브러리 의존성을 추가하지 않습니다.
        return RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
