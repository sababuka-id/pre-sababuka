BEGIN;

ALTER TABLE sababuka.user_mfa_methods
    ADD COLUMN last_used_counter bigint;

ALTER TABLE sababuka.user_mfa_methods
    ADD CONSTRAINT user_mfa_methods_counter_nonnegative
    CHECK (last_used_counter IS NULL OR last_used_counter >= 0);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('008', 'MFA replay protection counter')
ON CONFLICT (version) DO NOTHING;

COMMIT;
