BEGIN;

CREATE TABLE sababuka.auth_sessions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    token_hash          bytea NOT NULL UNIQUE,
    csrf_token_hash     bytea NOT NULL,
    ip_address          inet,
    user_agent          text,
    expires_at          timestamptz NOT NULL,
    last_seen_at        timestamptz NOT NULL DEFAULT now(),
    revoked_at          timestamptz,
    revoke_reason       varchar(120),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_sessions_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT auth_sessions_revocation_check CHECK (
        (revoked_at IS NULL AND revoke_reason IS NULL)
        OR revoked_at IS NOT NULL
    )
);

CREATE INDEX auth_sessions_user_idx ON sababuka.auth_sessions(user_id, expires_at DESC);
CREATE INDEX auth_sessions_active_idx ON sababuka.auth_sessions(expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE sababuka.user_mfa_methods (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    method_type         varchar(24) NOT NULL,
    label               varchar(120),
    encrypted_secret    bytea,
    credential_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_primary          boolean NOT NULL DEFAULT false,
    verified_at         timestamptz,
    disabled_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_mfa_methods_type_check CHECK (method_type IN ('totp', 'webauthn', 'recovery_codes')),
    CONSTRAINT user_mfa_methods_data_object CHECK (jsonb_typeof(credential_data) = 'object'),
    CONSTRAINT user_mfa_methods_secret_check CHECK (
        method_type <> 'totp' OR encrypted_secret IS NOT NULL
    )
);

CREATE INDEX user_mfa_methods_user_idx ON sababuka.user_mfa_methods(user_id);
CREATE UNIQUE INDEX user_mfa_methods_one_primary_idx
    ON sababuka.user_mfa_methods(user_id)
    WHERE is_primary = true AND disabled_at IS NULL;

CREATE TABLE sababuka.user_invitations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    token_hash          bytea NOT NULL UNIQUE,
    expires_at          timestamptz NOT NULL,
    accepted_at         timestamptz,
    revoked_at          timestamptz,
    created_by          uuid REFERENCES sababuka.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_invitations_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT user_invitations_terminal_check CHECK (num_nonnulls(accepted_at, revoked_at) <= 1)
);

CREATE INDEX user_invitations_user_idx ON sababuka.user_invitations(user_id, expires_at DESC);

CREATE TABLE sababuka.password_reset_tokens (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    token_hash          bytea NOT NULL UNIQUE,
    expires_at          timestamptz NOT NULL,
    used_at             timestamptz,
    revoked_at          timestamptz,
    requested_ip        inet,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT password_reset_tokens_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT password_reset_tokens_terminal_check CHECK (num_nonnulls(used_at, revoked_at) <= 1)
);

CREATE INDEX password_reset_tokens_user_idx ON sababuka.password_reset_tokens(user_id, expires_at DESC);

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('007', 'authentication sessions, MFA methods, invitations, and password recovery')
ON CONFLICT (version) DO NOTHING;

COMMIT;
