BEGIN;

CREATE TABLE sababuka.organizations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                varchar(64) NOT NULL,
    name                varchar(255) NOT NULL,
    short_name          varchar(120),
    organization_type   varchar(40) NOT NULL,
    parent_id           uuid REFERENCES sababuka.organizations(id),
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active           boolean NOT NULL DEFAULT true,
    archived_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT organizations_code_unique UNIQUE (code),
    CONSTRAINT organizations_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]*$'),
    CONSTRAINT organizations_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT organizations_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX organizations_parent_idx ON sababuka.organizations(parent_id);
CREATE INDEX organizations_active_idx ON sababuka.organizations(is_active) WHERE archived_at IS NULL;

CREATE TABLE sababuka.users (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   citext NOT NULL,
    username                citext,
    full_name               varchar(255) NOT NULL,
    password_hash           text,
    status                  varchar(24) NOT NULL DEFAULT 'invited',
    must_change_password    boolean NOT NULL DEFAULT true,
    mfa_required            boolean NOT NULL DEFAULT false,
    failed_login_count      integer NOT NULL DEFAULT 0,
    locked_until            timestamptz,
    last_login_at           timestamptz,
    archived_at             timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_username_unique UNIQUE (username),
    CONSTRAINT users_status_check CHECK (status IN ('invited', 'active', 'suspended', 'locked', 'archived')),
    CONSTRAINT users_failed_login_nonnegative CHECK (failed_login_count >= 0)
);

CREATE INDEX users_status_idx ON sababuka.users(status);

CREATE TABLE sababuka.organization_memberships (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id),
    organization_id     uuid NOT NULL REFERENCES sababuka.organizations(id),
    membership_type     varchar(32) NOT NULL DEFAULT 'member',
    is_primary          boolean NOT NULL DEFAULT false,
    starts_at           timestamptz NOT NULL DEFAULT now(),
    ends_at             timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT organization_memberships_unique UNIQUE (user_id, organization_id),
    CONSTRAINT organization_memberships_dates CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX organization_memberships_org_idx ON sababuka.organization_memberships(organization_id);
CREATE UNIQUE INDEX organization_memberships_one_primary_idx
    ON sababuka.organization_memberships(user_id)
    WHERE is_primary = true AND ends_at IS NULL;

CREATE TABLE sababuka.roles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(64) NOT NULL UNIQUE,
    name            varchar(120) NOT NULL,
    description     text,
    is_system       boolean NOT NULL DEFAULT false,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT roles_code_format CHECK (code ~ '^[a-z][a-z0-9._-]*$')
);

CREATE TABLE sababuka.permissions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(96) NOT NULL UNIQUE,
    name            varchar(160) NOT NULL,
    description     text,
    risk_level      varchar(16) NOT NULL DEFAULT 'normal',
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT permissions_code_format CHECK (code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
    CONSTRAINT permissions_risk_check CHECK (risk_level IN ('normal', 'elevated', 'critical'))
);

CREATE TABLE sababuka.role_permissions (
    role_id          uuid NOT NULL REFERENCES sababuka.roles(id) ON DELETE CASCADE,
    permission_id    uuid NOT NULL REFERENCES sababuka.permissions(id) ON DELETE CASCADE,
    granted_at       timestamptz NOT NULL DEFAULT now(),
    granted_by       uuid REFERENCES sababuka.users(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permissions_permission_idx ON sababuka.role_permissions(permission_id);

CREATE TABLE sababuka.user_role_assignments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id),
    role_id             uuid NOT NULL REFERENCES sababuka.roles(id),
    organization_id     uuid REFERENCES sababuka.organizations(id),
    scope_type          varchar(24) NOT NULL DEFAULT 'organization',
    starts_at           timestamptz NOT NULL DEFAULT now(),
    ends_at             timestamptz,
    assigned_by         uuid REFERENCES sababuka.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_role_assignments_scope_check CHECK (scope_type IN ('global', 'organization', 'self', 'published')),
    CONSTRAINT user_role_assignments_org_scope CHECK (
        (scope_type = 'organization' AND organization_id IS NOT NULL)
        OR (scope_type <> 'organization' AND organization_id IS NULL)
    ),
    CONSTRAINT user_role_assignments_dates CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT user_role_assignments_unique UNIQUE NULLS NOT DISTINCT (user_id, role_id, organization_id, scope_type)
);

CREATE INDEX user_role_assignments_role_idx ON sababuka.user_role_assignments(role_id);
CREATE INDEX user_role_assignments_org_idx ON sababuka.user_role_assignments(organization_id);

CREATE TABLE sababuka.menu_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                varchar(80) NOT NULL UNIQUE,
    parent_id           uuid REFERENCES sababuka.menu_items(id),
    label               varchar(120) NOT NULL,
    icon                varchar(80),
    route_name          varchar(120),
    required_permission varchar(96),
    display_order       integer NOT NULL DEFAULT 0,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT menu_items_code_format CHECK (code ~ '^[a-z][a-z0-9._-]*$'),
    CONSTRAINT menu_items_route_or_parent CHECK (route_name IS NOT NULL OR parent_id IS NULL),
    CONSTRAINT menu_items_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT menu_items_permission_fk FOREIGN KEY (required_permission)
        REFERENCES sababuka.permissions(code)
);

CREATE INDEX menu_items_parent_idx ON sababuka.menu_items(parent_id, display_order);

CREATE TABLE sababuka.role_menu_items (
    role_id        uuid NOT NULL REFERENCES sababuka.roles(id) ON DELETE CASCADE,
    menu_item_id   uuid NOT NULL REFERENCES sababuka.menu_items(id) ON DELETE CASCADE,
    is_visible     boolean NOT NULL DEFAULT true,
    display_order  integer,
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, menu_item_id)
);

CREATE INDEX role_menu_items_menu_idx ON sababuka.role_menu_items(menu_item_id);

CREATE TABLE sababuka.feature_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            varchar(80) NOT NULL UNIQUE,
    name            varchar(160) NOT NULL,
    description     text,
    is_enabled      boolean NOT NULL DEFAULT false,
    configuration   jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by      uuid REFERENCES sababuka.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT feature_flags_code_format CHECK (code ~ '^[a-z][a-z0-9._-]*$'),
    CONSTRAINT feature_flags_configuration_object CHECK (jsonb_typeof(configuration) = 'object')
);

CREATE TABLE sababuka.system_settings (
    key             varchar(120) PRIMARY KEY,
    value           jsonb NOT NULL,
    description     text,
    is_secret       boolean NOT NULL DEFAULT false,
    updated_by      uuid REFERENCES sababuka.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT system_settings_no_plain_secret CHECK (is_secret = false)
);

CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON sababuka.organizations
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON sababuka.users
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON sababuka.roles
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER menu_items_set_updated_at
BEFORE UPDATE ON sababuka.menu_items
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER feature_flags_set_updated_at
BEFORE UPDATE ON sababuka.feature_flags
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

CREATE TRIGGER system_settings_set_updated_at
BEFORE UPDATE ON sababuka.system_settings
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('002', 'identity, access control, menus, and system configuration')
ON CONFLICT (version) DO NOTHING;

COMMIT;
