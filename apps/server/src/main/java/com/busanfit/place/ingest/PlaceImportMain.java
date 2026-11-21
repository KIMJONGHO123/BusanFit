package com.busanfit.place.ingest;

import com.busanfit.place.ingest.adapter.JdbcPlaceImportStore;
import com.busanfit.place.ingest.adapter.LocalImportSettings;
import com.busanfit.place.ingest.adapter.PublicPlaceSource;
import java.time.Clock;

/** Explicit local CLI; has no Spring component/runner annotation and cannot run on app startup. */
public final class PlaceImportMain {
    private PlaceImportMain() { }

    public static void main(String[] args) {
        try {
            String mode = args.length == 1 ? args[0] : "inspect";
            if (!mode.equals("inspect") && !mode.equals("import")) {
                throw new IllegalArgumentException("MODE_MUST_BE_INSPECT_OR_IMPORT");
            }
            var settings = new LocalImportSettings();
            try (var connection = settings.connect()) {
                System.out.println("Database connected: MySQL " + connection.getMetaData().getDatabaseProductVersion());
                if (mode.equals("inspect")) {
                    try (var tables = connection.getMetaData().getTables(connection.getCatalog(), null, "%", new String[]{"TABLE"})) {
                        while (tables.next()) {
                            System.out.println("Table: " + tables.getString("TABLE_NAME"));
                        }
                    }
                    return;
                }
                var clock = Clock.systemUTC();
                var store = new JdbcPlaceImportStore(connection, clock);
                store.acquireLock();
                store.migrate();
                String key = settings.get("PUBLIC_DATA_SERVICE_KEY", null);
                var source = new PublicPlaceSource(settings.get("PUBLIC_DATA_BASE_URL",
                        "https://apis.data.go.kr/B551011/KorService2"),
                        "https://apis.data.go.kr/6260000/AttractionService", key,
                        settings.get("BUSAN_SERVICE_KEY", key), clock);
                for (var collection : new PlaceImportService(source, store).execute()) {
                    System.out.println("Published " + collection.source() + ": " + collection.places().size()
                            + " places; listing pages=" + collection.pages());
                }
                System.out.println("No place links created; search and diagnosis behavior unchanged.");
            }
        } catch (Exception failure) {
            System.err.println("Place import failed (" + failure.getClass().getSimpleName()
                    + "). Credentials and upstream response text are intentionally omitted.");
            System.exit(1);
        }
    }
}
