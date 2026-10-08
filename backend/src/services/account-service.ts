import type { AppConfig } from "../config.js";
import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import {
  buildTotpUri,
  decryptMfaSecret,
  encodeBase32,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotp,
} from "../security/mfa.js";
import { hashPassword } from "../security/password.js";
import { hashToken } from "../security/tokens.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

interface InvitationRow extends QueryResultRow {
  invitation_id: string;
  user_id: string;
  email: string;
  full_name: string;
  expires_at: Date;
}

interface MfaRow extends QueryResultRow {
  id: string;
  encrypted_secret: Buffer;
  last_used_counter: string | null;
}

export interface SelfRegistrationInput {
  email: string;
  username?: string | null;
  full_name: string;
  organization_id: string;
  password: string;
}

export class AccountService {
  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  private encryptionKey(): Buffer {
    if (!this.config.mfaEncryptionKey) {
      throw new ApiError(503, "INTERNAL_ERROR", "Konfigurasi enkripsi MFA belum tersedia.");
    }
    return this.config.mfaEncryptionKey;
  }

  async registrationOrganizations() {
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `SELECT id::text, code, name, short_name
       FROM sababuka.organizations
       WHERE is_active = true AND archived_at IS NULL
       ORDER BY name, code`,
    );
    return { data: result.rows };
  }

  async register(input: SelfRegistrationInput, audit: AuditContext) {
    const passwordHash = await hashPassword(input.password);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const organization = await client.query<{ id: string } & QueryResultRow>(
        `SELECT id::text FROM sababuka.organizations
         WHERE id = $1 AND is_active = true AND archived_at IS NULL
         FOR SHARE`,
        [input.organization_id],
      );
      if (!organization.rowCount) throw new ApiError(404, "NOT_FOUND", "Organisasi tidak ditemukan atau sudah tidak aktif.");

      const result = await client.query<QueryResultRow & Record<string, unknown>>(
        `INSERT INTO sababuka.users
           (email, username, full_name, password_hash, status, must_change_password, mfa_required)
         VALUES ($1, $2, $3, $4, 'invited', false, false)
         RETURNING id::text, email::text, username::text, full_name, status, created_at::text`,
        [input.email.trim().toLowerCase(), input.username?.trim() || null, input.full_name.trim(), passwordHash],
      );
      const user = result.rows[0]!;
      await client.query(
        `INSERT INTO sababuka.organization_memberships
           (user_id, organization_id, membership_type, is_primary)
         VALUES ($1, $2, 'applicant', true)`,
        [user.id, input.organization_id],
      );
      await recordAudit(client, {
        ...audit,
        actorId: user.id as string,
        eventType: "user.registration_requested",
        entityType: "user",
        entityId: user.id as string,
        organizationId: input.organization_id,
        afterData: { ...user, organization_id: input.organization_id },
      });
      await client.query("COMMIT");
      return {
        email: user.email,
        status: "pending_approval",
        message: "Pendaftaran berhasil. Akun akan dapat digunakan setelah diverifikasi Developer SABABUKA.",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") {
        throw new ApiError(409, "CONFLICT", "Email atau username sudah terdaftar.");
      }
      if (error instanceof ApiError) throw error;
      throw error;
    } finally {
      client.release();
    }
  }

  private async validInvitation(executor: unknown, token: string, lock = false) {
    const result = await (executor as Database).query<InvitationRow>(
      `SELECT i.id::text AS invitation_id, u.id::text AS user_id,
              u.email::text, u.full_name, i.expires_at
       FROM sababuka.user_invitations i
       JOIN sababuka.users u ON u.id = i.user_id
       WHERE i.token_hash = $1
         AND i.accepted_at IS NULL
         AND i.revoked_at IS NULL
         AND i.expires_at > now()
         AND u.status = 'invited'
         AND u.archived_at IS NULL
       LIMIT 1${lock ? " FOR UPDATE OF i, u" : ""}`,
      [hashToken(token)],
    );
    const invitation = result.rows[0];
    if (!invitation) throw new ApiError(404, "INVITATION_INVALID", "Undangan tidak valid atau telah kedaluwarsa.");
    return invitation;
  }

  async inspectInvitation(token: string) {
    const invitation = await this.validInvitation(this.db, token);
    const setup = await this.db.query<{ exists: boolean } & QueryResultRow>(
      `SELECT EXISTS (
         SELECT 1 FROM sababuka.user_mfa_methods
         WHERE user_id = $1 AND method_type = 'totp' AND disabled_at IS NULL
       ) AS exists`,
      [invitation.user_id],
    );
    return {
      email: invitation.email,
      full_name: invitation.full_name,
      expires_at: invitation.expires_at.toISOString(),
      mfa_setup_started: setup.rows[0]?.exists ?? false,
    };
  }

  async setupInvitationTotp(token: string, audit: AuditContext) {
    const key = this.encryptionKey();
    const secret = generateTotpSecret();
    const secretBase32 = encodeBase32(secret);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const invitation = await this.validInvitation(client, token, true);
      await client.query(
        `UPDATE sababuka.user_mfa_methods
         SET disabled_at = now(), is_primary = false
         WHERE user_id = $1 AND method_type = 'totp' AND verified_at IS NULL AND disabled_at IS NULL`,
        [invitation.user_id],
      );
      const method = await client.query<{ id: string } & QueryResultRow>(
        `INSERT INTO sababuka.user_mfa_methods
           (user_id, method_type, label, encrypted_secret, is_primary)
         VALUES ($1, 'totp', 'Authenticator utama', $2, true)
         RETURNING id::text`,
        [invitation.user_id, encryptMfaSecret(secret, key)],
      );
      await recordAudit(client, {
        ...audit,
        actorId: invitation.user_id,
        eventType: "auth.invitation_mfa_setup",
        entityType: "user_mfa_method",
        entityId: method.rows[0]!.id,
        metadata: { invitation_id: invitation.invitation_id },
      });
      await client.query("COMMIT");
      return {
        secret: secretBase32,
        provisioning_uri: buildTotpUri(this.config.mfaIssuer, invitation.email, secretBase32),
        issuer: this.config.mfaIssuer,
        account: invitation.email,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async acceptInvitation(token: string, password: string, mfaCode: string, audit: AuditContext) {
    const key = this.encryptionKey();
    const passwordHash = await hashPassword(password);
    const recoveryCodes = generateRecoveryCodes();
    const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const invitation = await this.validInvitation(client, token, true);
      const method = await client.query<MfaRow>(
        `SELECT id::text, encrypted_secret, last_used_counter::text
         FROM sababuka.user_mfa_methods
         WHERE user_id = $1 AND method_type = 'totp'
           AND verified_at IS NULL AND disabled_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1 FOR UPDATE`,
        [invitation.user_id],
      );
      const totp = method.rows[0];
      if (!totp) throw new ApiError(409, "MFA_REQUIRED", "Setup Authenticator harus dilakukan sebelum aktivasi.");
      const counter = verifyTotp(decryptMfaSecret(totp.encrypted_secret, key), mfaCode, {
        afterCounter: totp.last_used_counter === null ? null : Number(totp.last_used_counter),
      });
      if (counter === null) throw new ApiError(401, "MFA_INVALID", "Kode Authenticator tidak valid.");

      await client.query(
        `UPDATE sababuka.user_mfa_methods
         SET verified_at = now(), last_used_counter = $2
         WHERE id = $1`,
        [totp.id, counter],
      );
      await client.query(
        `UPDATE sababuka.users
         SET password_hash = $2, status = 'active', must_change_password = false,
             mfa_required = true, failed_login_count = 0, locked_until = NULL
         WHERE id = $1`,
        [invitation.user_id, passwordHash],
      );
      await client.query(
        `UPDATE sababuka.user_invitations SET accepted_at = now() WHERE id = $1`,
        [invitation.invitation_id],
      );
      await client.query(
        `UPDATE sababuka.user_mfa_methods
         SET disabled_at = now()
         WHERE user_id = $1 AND method_type = 'recovery_codes' AND disabled_at IS NULL`,
        [invitation.user_id],
      );
      await client.query(
        `INSERT INTO sababuka.user_mfa_methods
           (user_id, method_type, label, credential_data, is_primary, verified_at)
         VALUES ($1, 'recovery_codes', 'Recovery codes', $2::jsonb, false, now())`,
        [invitation.user_id, JSON.stringify({ hashes: recoveryHashes })],
      );
      await recordAudit(client, {
        ...audit,
        actorId: invitation.user_id,
        eventType: "auth.invitation_accepted",
        entityType: "user",
        entityId: invitation.user_id,
        metadata: { invitation_id: invitation.invitation_id, recovery_code_count: recoveryCodes.length },
      });
      await client.query("COMMIT");
      return {
        email: invitation.email,
        status: "active",
        recovery_codes: recoveryCodes,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async setupCurrentUserTotp(auth: AuthContext, audit: AuditContext) {
    const key = this.encryptionKey();
    const secret = generateTotpSecret();
    const secretBase32 = encodeBase32(secret);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const verified = await client.query(
        `SELECT 1 FROM sababuka.user_mfa_methods
         WHERE user_id = $1 AND method_type = 'totp'
           AND verified_at IS NOT NULL AND disabled_at IS NULL`,
        [auth.user.id],
      );
      if (verified.rowCount) throw new ApiError(409, "CONFLICT", "Authenticator aktif sudah tersedia.");
      await client.query(
        `UPDATE sababuka.user_mfa_methods
         SET disabled_at = now(), is_primary = false
         WHERE user_id = $1 AND method_type = 'totp' AND verified_at IS NULL AND disabled_at IS NULL`,
        [auth.user.id],
      );
      const method = await client.query<{ id: string } & QueryResultRow>(
        `INSERT INTO sababuka.user_mfa_methods
           (user_id, method_type, label, encrypted_secret, is_primary)
         VALUES ($1, 'totp', 'Authenticator utama', $2, true)
         RETURNING id::text`,
        [auth.user.id, encryptMfaSecret(secret, key)],
      );
      await recordAudit(client, {
        ...audit,
        eventType: "auth.mfa_setup_started",
        entityType: "user_mfa_method",
        entityId: method.rows[0]!.id,
      });
      await client.query("COMMIT");
      return {
        secret: secretBase32,
        provisioning_uri: buildTotpUri(this.config.mfaIssuer, auth.user.email, secretBase32),
        issuer: this.config.mfaIssuer,
        account: auth.user.email,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmCurrentUserTotp(auth: AuthContext, mfaCode: string, audit: AuditContext) {
    const key = this.encryptionKey();
    const recoveryCodes = generateRecoveryCodes();
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const method = await client.query<MfaRow>(
        `SELECT id::text, encrypted_secret, last_used_counter::text
         FROM sababuka.user_mfa_methods
         WHERE user_id = $1 AND method_type = 'totp'
           AND verified_at IS NULL AND disabled_at IS NULL
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [auth.user.id],
      );
      const totp = method.rows[0];
      if (!totp) throw new ApiError(404, "NOT_FOUND", "Setup Authenticator belum tersedia.");
      const counter = verifyTotp(decryptMfaSecret(totp.encrypted_secret, key), mfaCode);
      if (counter === null) throw new ApiError(401, "MFA_INVALID", "Kode Authenticator tidak valid.");
      await client.query(
        `UPDATE sababuka.user_mfa_methods
         SET verified_at = now(), last_used_counter = $2 WHERE id = $1`,
        [totp.id, counter],
      );
      await client.query(`UPDATE sababuka.users SET mfa_required = true WHERE id = $1`, [auth.user.id]);
      await client.query(
        `UPDATE sababuka.user_mfa_methods SET disabled_at = now()
         WHERE user_id = $1 AND method_type = 'recovery_codes' AND disabled_at IS NULL`,
        [auth.user.id],
      );
      await client.query(
        `INSERT INTO sababuka.user_mfa_methods
           (user_id, method_type, label, credential_data, verified_at)
         VALUES ($1, 'recovery_codes', 'Recovery codes', $2::jsonb, now())`,
        [auth.user.id, JSON.stringify({ hashes: recoveryCodes.map(hashRecoveryCode) })],
      );
      await recordAudit(client, {
        ...audit,
        eventType: "auth.mfa_enabled",
        entityType: "user",
        entityId: auth.user.id,
        metadata: { recovery_code_count: recoveryCodes.length },
      });
      await client.query("COMMIT");
      return { recovery_codes: recoveryCodes };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
