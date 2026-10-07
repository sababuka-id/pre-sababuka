BEGIN;

CREATE TABLE sababuka.workflow_actions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     varchar(40) NOT NULL,
    entity_id       uuid NOT NULL,
    batch_id        uuid REFERENCES sababuka.data_batches(id),
    action          varchar(64) NOT NULL,
    from_status     varchar(32),
    to_status       varchar(32) NOT NULL,
    actor_id        uuid NOT NULL REFERENCES sababuka.users(id),
    actor_role_code varchar(64) NOT NULL,
    organization_id uuid REFERENCES sababuka.organizations(id),
    notes           text,
    request_id      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workflow_actions_entity_type_check CHECK (
        entity_type IN ('indicator_version', 'dataset_version', 'data_batch', 'publication')
    ),
    CONSTRAINT workflow_actions_status_change CHECK (from_status IS NULL OR from_status <> to_status)
);

CREATE INDEX workflow_actions_entity_idx ON sababuka.workflow_actions(entity_type, entity_id, created_at DESC);
CREATE INDEX workflow_actions_batch_idx ON sababuka.workflow_actions(batch_id, created_at DESC);
CREATE INDEX workflow_actions_actor_idx ON sababuka.workflow_actions(actor_id, created_at DESC);

CREATE TABLE sababuka.publications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_key     varchar(80) NOT NULL,
    version_number      integer NOT NULL,
    publication_number  varchar(120) NOT NULL UNIQUE,
    title               varchar(500) NOT NULL,
    description         text,
    status              varchar(20) NOT NULL DEFAULT 'draft',
    effective_at        timestamptz,
    replaced_by_id      uuid REFERENCES sababuka.publications(id),
    change_notes        text,
    created_by          uuid NOT NULL REFERENCES sababuka.users(id),
    activated_by        uuid REFERENCES sababuka.users(id),
    activated_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT publications_key_version_unique UNIQUE (publication_key, version_number),
    CONSTRAINT publications_version_positive CHECK (version_number > 0),
    CONSTRAINT publications_status_check CHECK (status IN ('draft', 'active', 'replaced', 'withdrawn')),
    CONSTRAINT publications_not_self_replaced CHECK (replaced_by_id IS NULL OR replaced_by_id <> id),
    CONSTRAINT publications_activation_check CHECK (
        (status IN ('active', 'replaced') AND activated_by IS NOT NULL AND activated_at IS NOT NULL)
        OR status IN ('draft', 'withdrawn')
    )
);

CREATE UNIQUE INDEX publications_one_active_key_idx
    ON sababuka.publications(publication_key)
    WHERE status = 'active';
CREATE INDEX publications_status_idx ON sababuka.publications(status, effective_at DESC);

CREATE TABLE sababuka.publication_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id      uuid NOT NULL REFERENCES sababuka.publications(id) ON DELETE CASCADE,
    observation_id      uuid NOT NULL REFERENCES sababuka.observations(id),
    dataset_version_id  uuid NOT NULL REFERENCES sababuka.dataset_versions(id),
    display_order       integer NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT publication_items_unique UNIQUE (publication_id, observation_id)
);

CREATE INDEX publication_items_observation_idx ON sababuka.publication_items(observation_id);
CREATE INDEX publication_items_dataset_idx ON sababuka.publication_items(dataset_version_id);

CREATE TABLE sababuka.notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES sababuka.users(id) ON DELETE CASCADE,
    notification_type varchar(64) NOT NULL,
    title           varchar(255) NOT NULL,
    message         text NOT NULL,
    entity_type     varchar(40),
    entity_id       uuid,
    read_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx ON sababuka.notifications(user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE TABLE sababuka.assistant_sessions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES sababuka.users(id),
    organization_id     uuid REFERENCES sababuka.organizations(id),
    title               varchar(255),
    status              varchar(16) NOT NULL DEFAULT 'active',
    started_at          timestamptz NOT NULL DEFAULT now(),
    ended_at            timestamptz,
    CONSTRAINT assistant_sessions_status_check CHECK (status IN ('active', 'closed', 'archived')),
    CONSTRAINT assistant_sessions_dates_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX assistant_sessions_user_idx ON sababuka.assistant_sessions(user_id, started_at DESC);

CREATE TABLE sababuka.assistant_messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid NOT NULL REFERENCES sababuka.assistant_sessions(id) ON DELETE CASCADE,
    message_role    varchar(16) NOT NULL,
    content         text NOT NULL,
    model_name      varchar(120),
    structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_id      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assistant_messages_role_check CHECK (message_role IN ('user', 'assistant', 'system')),
    CONSTRAINT assistant_messages_data_object CHECK (jsonb_typeof(structured_data) = 'object')
);

CREATE INDEX assistant_messages_session_idx ON sababuka.assistant_messages(session_id, created_at);

CREATE TABLE sababuka.assistant_citations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          uuid NOT NULL REFERENCES sababuka.assistant_messages(id) ON DELETE CASCADE,
    publication_item_id uuid NOT NULL REFERENCES sababuka.publication_items(id),
    citation_label      varchar(255),
    excerpt_data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assistant_citations_unique UNIQUE (message_id, publication_item_id),
    CONSTRAINT assistant_citations_excerpt_object CHECK (jsonb_typeof(excerpt_data) = 'object')
);

CREATE INDEX assistant_citations_item_idx ON sababuka.assistant_citations(publication_item_id);

CREATE TABLE sababuka.audit_events (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id            uuid REFERENCES sababuka.users(id),
    organization_id     uuid REFERENCES sababuka.organizations(id),
    event_type          varchar(96) NOT NULL,
    entity_type         varchar(64) NOT NULL,
    entity_id           uuid,
    before_data         jsonb,
    after_data          jsonb,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_id          uuid,
    ip_address          inet,
    user_agent          text,
    occurred_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_events_before_object CHECK (before_data IS NULL OR jsonb_typeof(before_data) = 'object'),
    CONSTRAINT audit_events_after_object CHECK (after_data IS NULL OR jsonb_typeof(after_data) = 'object'),
    CONSTRAINT audit_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_events_entity_idx ON sababuka.audit_events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_events_actor_idx ON sababuka.audit_events(actor_id, occurred_at DESC);
CREATE INDEX audit_events_time_idx ON sababuka.audit_events(occurred_at DESC);
CREATE INDEX audit_events_request_idx ON sababuka.audit_events(request_id) WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sababuka.prevent_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% is append-only; update and delete are not allowed', TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION sababuka.validate_publication_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    publication_status varchar(20);
    batch_status varchar(24);
    observation_dataset_version uuid;
BEGIN
    SELECT status INTO publication_status
    FROM sababuka.publications
    WHERE id = NEW.publication_id;

    IF publication_status IS DISTINCT FROM 'draft' THEN
        RAISE EXCEPTION 'publication items can only be changed while publication is draft'
            USING ERRCODE = '23514';
    END IF;

    SELECT b.status, b.dataset_version_id
      INTO batch_status, observation_dataset_version
    FROM sababuka.observations o
    JOIN sababuka.data_batches b ON b.id = o.batch_id
    WHERE o.id = NEW.observation_id;

    IF batch_status NOT IN ('approved', 'published') THEN
        RAISE EXCEPTION 'only approved observations can be included in a publication'
            USING ERRCODE = '23514';
    END IF;

    IF observation_dataset_version IS DISTINCT FROM NEW.dataset_version_id THEN
        RAISE EXCEPTION 'dataset version does not match observation batch'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sababuka.prevent_published_observation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sababuka.publication_items pi
        JOIN sababuka.publications p ON p.id = pi.publication_id
        WHERE pi.observation_id = OLD.id
          AND p.status IN ('active', 'replaced')
    ) THEN
        RAISE EXCEPTION 'published observations are immutable; create a revision instead'
            USING ERRCODE = '55000';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sababuka.protect_publication_item_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    publication_status varchar(20);
BEGIN
    SELECT status INTO publication_status
    FROM sababuka.publications
    WHERE id = OLD.publication_id;

    IF publication_status IS DISTINCT FROM 'draft' THEN
        RAISE EXCEPTION 'publication items can only be deleted while publication is draft'
            USING ERRCODE = '55000';
    END IF;

    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION sababuka.protect_publication_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM 'draft' THEN
        RAISE EXCEPTION 'non-draft publications cannot be deleted'
            USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER workflow_actions_append_only
BEFORE UPDATE OR DELETE ON sababuka.workflow_actions
FOR EACH ROW EXECUTE FUNCTION sababuka.prevent_append_only_mutation();

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON sababuka.audit_events
FOR EACH ROW EXECUTE FUNCTION sababuka.prevent_append_only_mutation();

CREATE TRIGGER publication_items_validate
BEFORE INSERT OR UPDATE ON sababuka.publication_items
FOR EACH ROW EXECUTE FUNCTION sababuka.validate_publication_item();

CREATE TRIGGER publication_items_protect_delete
BEFORE DELETE ON sababuka.publication_items
FOR EACH ROW EXECUTE FUNCTION sababuka.protect_publication_item_delete();

CREATE TRIGGER publications_protect_delete
BEFORE DELETE ON sababuka.publications
FOR EACH ROW EXECUTE FUNCTION sababuka.protect_publication_delete();

CREATE TRIGGER observations_published_immutable
BEFORE UPDATE OR DELETE ON sababuka.observations
FOR EACH ROW EXECUTE FUNCTION sababuka.prevent_published_observation_mutation();

CREATE TRIGGER publications_set_updated_at
BEFORE UPDATE ON sababuka.publications
FOR EACH ROW EXECUTE FUNCTION sababuka.set_updated_at();

INSERT INTO sababuka.schema_migrations (version, description)
VALUES ('005', 'workflow, publication, notifications, assistant citations, and audit')
ON CONFLICT (version) DO NOTHING;

COMMIT;
