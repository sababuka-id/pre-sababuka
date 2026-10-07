BEGIN;

CREATE TABLE IF NOT EXISTS sababuka.submission_evidence (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id                uuid NOT NULL REFERENCES sababuka.data_batches(id),
    indicator_version_id    uuid REFERENCES sababuka.indicator_versions(id),
    original_filename       varchar(500) NOT NULL,
    storage_key             varchar(1000) NOT NULL UNIQUE,
    mime_type               varchar(160) NOT NULL,
    byte_size               bigint NOT NULL,
    checksum_sha256         varchar(64) NOT NULL,
    uploaded_by             uuid NOT NULL REFERENCES sababuka.users(id),
    uploaded_at             timestamptz NOT NULL DEFAULT now(),
    deleted_by              uuid REFERENCES sababuka.users(id),
    deleted_at              timestamptz,
    CONSTRAINT submission_evidence_size_check CHECK (byte_size > 0 AND byte_size <= 10485760),
    CONSTRAINT submission_evidence_checksum_check CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$'),
    CONSTRAINT submission_evidence_mime_check CHECK (mime_type IN (
        'application/pdf', 'image/jpeg', 'image/png',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )),
    CONSTRAINT submission_evidence_delete_check CHECK (
        (deleted_at IS NULL AND deleted_by IS NULL) OR
        (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS submission_evidence_batch_idx
    ON sababuka.submission_evidence(batch_id, uploaded_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS submission_evidence_indicator_idx
    ON sababuka.submission_evidence(indicator_version_id)
    WHERE deleted_at IS NULL;

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('011', 'private submission evidence metadata and checksum')
ON CONFLICT (version) DO NOTHING;

COMMIT;
