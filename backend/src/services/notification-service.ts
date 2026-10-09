import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";

type Queryable = Pick<Database, "query">;

export async function notifyRole(db: Queryable, roleCode: string, notification: { type: string; title: string; message: string; entityType: string; entityId: string }, excludeUserId?: string) {
  await db.query(
    `INSERT INTO sababuka.notifications (user_id, notification_type, title, message, entity_type, entity_id)
     SELECT DISTINCT ura.user_id, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::uuid
     FROM sababuka.user_role_assignments ura JOIN sababuka.roles r ON r.id = ura.role_id
     JOIN sababuka.users u ON u.id = ura.user_id AND u.status = 'active'
     WHERE r.code = $1::varchar AND ura.starts_at <= now() AND (ura.ends_at IS NULL OR ura.ends_at > now())
       AND ($7::uuid IS NULL OR ura.user_id <> $7::uuid)`,
    [roleCode, notification.type, notification.title, notification.message, notification.entityType, notification.entityId, excludeUserId ?? null],
  );
}

export async function notifyOrganization(db: Queryable, organizationId: string, notification: { type: string; title: string; message: string; entityType: string; entityId: string }, excludeUserId?: string) {
  await db.query(
    `INSERT INTO sababuka.notifications (user_id, notification_type, title, message, entity_type, entity_id)
     SELECT DISTINCT om.user_id, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::uuid
     FROM sababuka.organization_memberships om JOIN sababuka.users u ON u.id = om.user_id AND u.status = 'active'
     WHERE om.organization_id = $1::uuid AND om.starts_at <= now() AND (om.ends_at IS NULL OR om.ends_at > now())
       AND ($7::uuid IS NULL OR om.user_id <> $7::uuid)`,
    [organizationId, notification.type, notification.title, notification.message, notification.entityType, notification.entityId, excludeUserId ?? null],
  );
}

export async function notifyUser(db: Queryable, userId: string, notification: { type: string; title: string; message: string; entityType: string; entityId: string }) {
  await db.query(
    `INSERT INTO sababuka.notifications (user_id, notification_type, title, message, entity_type, entity_id)
     SELECT id, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::uuid
     FROM sababuka.users
     WHERE id = $1::uuid AND status = 'active'`,
    [userId, notification.type, notification.title, notification.message, notification.entityType, notification.entityId],
  );
}

export class NotificationService {
  constructor(private readonly db: Database) {}
  async list(userId: string, unreadOnly: boolean) {
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT id::text, notification_type, title, message, entity_type, entity_id::text,
              read_at::text, created_at::text
       FROM sababuka.notifications WHERE user_id = $1 AND ($2::boolean = false OR read_at IS NULL)
       ORDER BY created_at DESC, id DESC LIMIT 100`, [userId, unreadOnly],
    );
    const count = await this.db.query<{ count: number }>(`SELECT count(*)::int AS count FROM sababuka.notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]);
    return { data: result.rows, unread_count: count.rows[0]?.count ?? 0 };
  }
  async markRead(userId: string, id: string) {
    const result = await this.db.query(`UPDATE sababuka.notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (result.rowCount !== 1) throw new ApiError(404, "NOT_FOUND", "Notifikasi tidak ditemukan.");
  }
  async markAllRead(userId: string) { await this.db.query(`UPDATE sababuka.notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId]); }
}
