-- Explicitly applied by the opt-in placeImport command. Never executed on server startup.
-- Additive only: legacy places/users/trip tables are not modified.
CREATE TABLE IF NOT EXISTS place_import_run (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    schema_tag VARCHAR(40) NOT NULL,
    source VARCHAR(16) NOT NULL,
    scope_description VARCHAR(100) NOT NULL,
    status VARCHAR(16) NOT NULL,
    started_at DATETIME(6) NOT NULL,
    completed_at DATETIME(6) NULL,
    expected_count INT NULL,
    collected_count INT NULL,
    page_count INT NULL,
    failure_code VARCHAR(100) NULL,
    INDEX idx_import_source_status (source, status, completed_at),
    CONSTRAINT chk_import_source CHECK (source IN ('TOURAPI', 'BUSAN')),
    CONSTRAINT chk_import_status CHECK (status IN ('COLLECTING', 'SUCCEEDED', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS tourapi_place (
    content_id VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(500) NULL,
    address VARCHAR(1000) NULL,
    region_code VARCHAR(10) NULL,
    latitude DOUBLE NULL,
    longitude DOUBLE NULL,
    source_modified_at VARCHAR(40) NULL,
    last_checked_at DATETIME(6) NOT NULL,
    last_success_run_id BIGINT NOT NULL,
    data_version BIGINT NOT NULL,
    content_hash CHAR(64) NOT NULL,
    matching_hash CHAR(64) NOT NULL,
    details JSON NOT NULL,
    field_status JSON NOT NULL,
    INDEX idx_tourapi_region_name (region_code, name(100)),
    CONSTRAINT fk_tourapi_import FOREIGN KEY (last_success_run_id) REFERENCES place_import_run(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS busan_attraction (
    uc_seq VARCHAR(64) NOT NULL PRIMARY KEY,
    name VARCHAR(500) NULL,
    address VARCHAR(1000) NULL,
    region_code VARCHAR(10) NULL,
    latitude DOUBLE NULL,
    longitude DOUBLE NULL,
    source_modified_at VARCHAR(40) NULL,
    last_checked_at DATETIME(6) NOT NULL,
    last_success_run_id BIGINT NOT NULL,
    data_version BIGINT NOT NULL,
    content_hash CHAR(64) NOT NULL,
    matching_hash CHAR(64) NOT NULL,
    details JSON NOT NULL,
    field_status JSON NOT NULL,
    INDEX idx_busan_region_name (region_code, name(100)),
    CONSTRAINT fk_busan_import FOREIGN KEY (last_success_run_id) REFERENCES place_import_run(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS place_link (
    content_id VARCHAR(64) NOT NULL PRIMARY KEY,
    uc_seq VARCHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL,
    link_method VARCHAR(16) NOT NULL,
    tour_data_version BIGINT NOT NULL,
    busan_data_version BIGINT NOT NULL,
    criteria_version VARCHAR(40) NOT NULL,
    evidence JSON NOT NULL,
    checked_at DATETIME(6) NOT NULL,
    row_version BIGINT NOT NULL DEFAULT 1,
    UNIQUE KEY uq_link_busan (uc_seq),
    CONSTRAINT fk_link_tourapi FOREIGN KEY (content_id) REFERENCES tourapi_place(content_id),
    CONSTRAINT fk_link_busan FOREIGN KEY (uc_seq) REFERENCES busan_attraction(uc_seq),
    CONSTRAINT chk_link_status CHECK (status IN ('CONNECTED', 'REVIEW_REQUIRED')),
    CONSTRAINT chk_link_method CHECK (link_method IN ('AUTO', 'MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS place_link_review (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL,
    uc_seq VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    tour_data_version BIGINT NOT NULL,
    busan_data_version BIGINT NOT NULL,
    criteria_version VARCHAR(40) NOT NULL,
    evidence JSON NOT NULL,
    reviewed_by VARCHAR(100) NOT NULL,
    reviewed_at DATETIME(6) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    INDEX idx_review_pair_time (content_id, uc_seq, reviewed_at),
    CONSTRAINT fk_review_tourapi FOREIGN KEY (content_id) REFERENCES tourapi_place(content_id),
    CONSTRAINT fk_review_busan FOREIGN KEY (uc_seq) REFERENCES busan_attraction(uc_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
