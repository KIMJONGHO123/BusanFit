package com.busanfit.diagnosis;

import com.busanfit.BusanfitApplication;
import org.springframework.boot.SpringApplication;

/** An opt-in HTTP server for browser tests; command-line overrides keep every write in H2. */
public final class WebDiagnosisTestServer {
    private WebDiagnosisTestServer() { }

    public static void main(String[] args) {
        if (!"1".equals(System.getenv("BUSANFIT_LIVE_WEB_DIAGNOSIS"))) {
            throw new IllegalStateException("실제 웹 진단 테스트를 명시적으로 활성화해야 합니다.");
        }
        SpringApplication.run(BusanfitApplication.class,
                "--server.port=18080",
                "--app.cors.allowed-origins=http://127.0.0.1:5174",
                "--spring.config.import=optional:file:src/main/resources/application-env.yaml",
                "--spring.datasource.url=jdbc:h2:mem:diagnosis_web;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.jpa.hibernate.ddl-auto=create-drop",
                "--spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
                "--spring.sql.init.mode=never",
                "--jwt.secret=busanfit-isolated-web-test-secret",
                "--jwt.access-token-expiration-millis=3600000",
                "--external.public-data.service-key=${PUBLIC_DATA_SERVICE_KEY:}",
                "--external.public-data.base-url=${PUBLIC_DATA_BASE_URL:https://apis.data.go.kr/B551011/KorService2}",
                "--external.public-data.timeout=10s",
                "--external.tmap.app-key=${TMAP_APP_KEY:}",
                "--external.tmap.base-url=${TMAP_BASE_URL:https://apis.openapi.sk.com/tmap}",
                "--external.tmap.timeout=10s");
    }
}
