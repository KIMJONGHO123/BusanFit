package com.busanfit.place.ingest.adapter;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.FileSystemResource;

/** Reads existing local configuration without starting Spring or printing credentials. */
public final class LocalImportSettings {
    private final Map<String, Object> values = new HashMap<>();

    public LocalImportSettings() {
        var path = Path.of("src/main/resources/application-env.yaml");
        if (path.toFile().isFile()) {
            try {
                for (var source : new YamlPropertySourceLoader().load("local-place-import", new FileSystemResource(path))) {
                    for (var key : new String[]{"DB_URL", "DB_USERNAME", "DB_PASSWORD", "PUBLIC_DATA_SERVICE_KEY",
                            "PUBLIC_DATA_BASE_URL", "BUSAN_SERVICE_KEY"}) {
                        Object value = source.getProperty(key);
                        if (value != null) {
                            values.put(key, value);
                        }
                    }
                }
            } catch (Exception failure) {
                throw new IllegalStateException("LOCAL_CONFIG_READ_FAILED");
            }
        }
    }

    public String get(String key, String fallback) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            value = values.containsKey(key) ? String.valueOf(values.get(key)) : fallback;
        }
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("MISSING_SETTING_" + key);
        }
        return value;
    }

    public Connection connect() throws SQLException {
        var properties = new java.util.Properties();
        properties.setProperty("user", get("DB_USERNAME", null));
        properties.setProperty("password", get("DB_PASSWORD", null));
        properties.setProperty("connectionTimeZone", "UTC");
        properties.setProperty("forceConnectionTimeZoneToSession", "true");
        properties.setProperty("characterEncoding", "UTF-8");
        return DriverManager.getConnection(get("DB_URL", null), properties);
    }
}
