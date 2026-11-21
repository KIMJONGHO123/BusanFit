-- Run in a dedicated mysql client session. The CALL owns the transaction.
DELIMITER $$
DROP PROCEDURE IF EXISTS task017_connect_place_details$$
CREATE PROCEDURE task017_connect_place_details()
SQL SECURITY INVOKER
BEGIN
    DECLARE owns_lock INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS detail_candidates;
        IF owns_lock = 1 THEN
            DO RELEASE_LOCK('busanfit_task016_import');
        END IF;
        RESIGNAL;
    END;

    SELECT GET_LOCK('busanfit_task016_import', 0) INTO owns_lock;
    IF COALESCE(owns_lock, 0) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Place import lock unavailable';
    END IF;
    START TRANSACTION;
    CREATE TEMPORARY TABLE detail_candidates AS
    SELECT t.content_id, b.uc_seq, t.data_version AS tour_version, b.data_version AS busan_version,
           JSON_OBJECT('name', t.name, 'address', t.address, 'region', t.region_code,
                       'tourLatitude', t.latitude, 'tourLongitude', t.longitude,
                       'busanLatitude', b.latitude, 'busanLongitude', b.longitude,
                       'tourMatchingHash', t.matching_hash, 'busanMatchingHash', b.matching_hash) AS evidence
    FROM tourapi_place t
    JOIN busan_attraction b ON b.name = t.name AND b.address = t.address AND b.region_code = t.region_code
    JOIN place_import_run tr ON tr.id = t.last_success_run_id AND tr.source = 'TOURAPI'
    JOIN place_import_run br ON br.id = b.last_success_run_id AND br.source = 'BUSAN'
    WHERE t.region_code = '26' AND t.address <> ''
      AND (t.content_id, b.uc_seq, t.matching_hash, b.matching_hash) IN (
        ('2788424','298','910d56f56d503fc5157d6697aa2616a76a5e133c9bb52b9d21faa603a75110cd','3f30846bccb120ade38c8deab608c061062ca6d81f4b6a3bfbbb44bc8a2c0bff'),
        ('127771','301','0aee0f088ecf40464af5281be1bec7ff95fe2fe1041e43d8a53e7087c6042e97','c9bf135414853c066a7a910c15d0e742189be7f7b4ef7f2c3915303288973f37'),
        ('2456767','372','d27e5a548717df47d555948d73a7278a4d51cf2a9cc01b6a75ddc020a2b17bef','8ceb4320b5eb8487d359f4aa98f120335c20c1dd4b0a78a0be0353708d5c75ab'))
      AND ST_Distance_Sphere(POINT(t.longitude,t.latitude), POINT(b.longitude,b.latitude)) <= 100
      AND tr.status = 'SUCCEEDED' AND br.status = 'SUCCEEDED'
      AND tr.id = (SELECT MAX(id) FROM place_import_run WHERE source='TOURAPI')
      AND br.id = (SELECT MAX(id) FROM place_import_run WHERE source='BUSAN')
      AND tr.expected_count = (SELECT COUNT(*) FROM tourapi_place WHERE last_success_run_id=tr.id)
      AND br.expected_count = (SELECT COUNT(*) FROM busan_attraction WHERE last_success_run_id=br.id)
      AND NOT EXISTS (SELECT 1 FROM tourapi_place x WHERE x.name=t.name AND x.content_id<>t.content_id)
      AND NOT EXISTS (SELECT 1 FROM busan_attraction x WHERE x.name=b.name AND x.uc_seq<>b.uc_seq)
      AND NOT EXISTS (SELECT 1 FROM place_link l WHERE l.content_id=t.content_id OR l.uc_seq=b.uc_seq)
      AND NOT EXISTS (SELECT 1 FROM place_link_review r WHERE r.content_id=t.content_id OR r.uc_seq=b.uc_seq);
    INSERT INTO place_link(content_id,uc_seq,status,link_method,tour_data_version,busan_data_version,criteria_version,evidence,checked_at)
    SELECT content_id,uc_seq,'CONNECTED','AUTO',tour_version,busan_version,'EXACT_100M_V1',evidence,UTC_TIMESTAMP(6)
    FROM detail_candidates;
    INSERT INTO place_link_review(content_id,uc_seq,event_type,tour_data_version,busan_data_version,criteria_version,evidence,reviewed_by,reviewed_at,reason)
    SELECT content_id,uc_seq,'CONNECTED',tour_version,busan_version,'EXACT_100M_V1',evidence,'EXACT_MATCH',UTC_TIMESTAMP(6),'Unique name and address, reviewed facility scope, within 100m'
    FROM detail_candidates;
    COMMIT;
    DROP TEMPORARY TABLE detail_candidates;
    DO RELEASE_LOCK('busanfit_task016_import');
END$$
CALL task017_connect_place_details()$$
DROP PROCEDURE task017_connect_place_details$$
DELIMITER ;
