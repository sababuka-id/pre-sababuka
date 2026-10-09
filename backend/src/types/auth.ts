export interface EffectiveRole {
  code: string;
  scope_type: "global" | "organization" | "self" | "published";
  organization_id: string | null;
}

export interface AuthOrganization {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  organization_type: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  mfa_required: boolean;
  must_change_password: boolean;
  roles: EffectiveRole[];
  permissions: string[];
  organizations: AuthOrganization[];
}

export interface AuthContext {
  sessionId: string;
  csrfTokenHash: Buffer;
  user: CurrentUser;
}
