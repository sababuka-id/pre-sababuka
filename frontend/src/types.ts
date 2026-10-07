export interface EffectiveRole {
  code: string;
  scope_type: "global" | "organization" | "self" | "published";
  organization_id: string | null;
}

export interface Organization {
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
  roles: EffectiveRole[];
  permissions: string[];
  organizations: Organization[];
}

export interface MenuItem {
  code: string;
  label: string;
  icon: string | null;
  route_name: string | null;
  display_order: number;
  children: MenuItem[];
}

export interface PageMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PageResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface UserSummary {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  status: "invited" | "active" | "suspended" | "locked" | "archived";
  mfa_required: boolean;
  organization_id: string | null;
  organization_code: string | null;
  organization_name: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  permissions: string[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  risk_level: "normal" | "elevated" | "critical";
}

export interface AdminMenuItem {
  id: string;
  code: string;
  parent_id: string | null;
  parent_code: string | null;
  label: string;
  icon: string | null;
  route_name: string | null;
  required_permission: string | null;
  display_order: number;
  is_active: boolean;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  configuration: Record<string, unknown>;
  updated_at: string;
}

export interface PolicyFocus {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  policy_focus_id: string | null;
  policy_focus_name: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  review_status: "draft" | "in_review" | "approved" | "rejected";
  submitted_by: string | null;
  submitted_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  indicator_count: number;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  decimal_places: number;
}

export interface Period {
  id: string;
  code: string;
  label: string;
  period_type: string;
  starts_on: string;
  ends_on: string;
}

export interface IndicatorOrganization {
  organization_id: string;
  organization_name: string;
  responsibility: "primary_producer" | "supporter" | "validator" | "curator";
  is_primary: boolean;
}

export interface IndicatorTarget {
  id: string;
  period_id: string;
  period_code: string;
  period_label: string;
  numeric_value: string | null;
  text_value: string | null;
  notes: string | null;
}

export interface Indicator {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category_name: string;
  category_review_status: "draft" | "in_review" | "approved" | "rejected";
  owner_organization_id: string | null;
  owner_organization_name: string | null;
  is_active: boolean;
  version_id: string;
  version_number: number;
  definition: string;
  formula: string | null;
  frequency: string;
  data_type: string;
  direction: "increase" | "decrease" | "maintain" | null;
  source_reference: string | null;
  access_level: string;
  effective_from: string;
  status: "draft" | "in_review" | "opd_verification" | "approved" | "active" | "retired";
  unit_id: string;
  unit_name: string;
  unit_symbol: string | null;
  organizations: IndicatorOrganization[];
  targets: IndicatorTarget[];
}

export interface SubmissionObservation {
  indicator_version_id: string;
  indicator_code: string;
  indicator_name: string;
  data_type: string;
  unit_name: string;
  unit_symbol: string | null;
  target_numeric_value: string | null;
  target_text_value: string | null;
  observation_id: string | null;
  numeric_value: string | null;
  text_value: string | null;
  notes: string | null;
  quality_status: string | null;
}

export interface Submission {
  id: string;
  dataset_version_id: string;
  organization_id: string;
  organization_code: string;
  organization_name: string;
  reporting_period_id: string;
  period_code: string;
  period_label: string;
  submission_method: string;
  status: "draft" | "submitted" | "under_review" | "returned" | "approved";
  row_count: number;
  submitted_at: string | null;
  approved_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  observations: SubmissionObservation[];
}

export interface SubmissionEvidence {
  id: string;
  batch_id: string;
  indicator_version_id: string | null;
  indicator_code: string | null;
  indicator_name: string | null;
  original_filename: string;
  mime_type: string;
  byte_size: string;
  checksum_sha256: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface PublicationItem {
  id: string; observation_id: string; dataset_version_id: string; display_order: number;
  indicator_code: string; indicator_name: string; period_label: string;
  numeric_value: string | null; text_value: string | null; unit_name: string; unit_symbol: string | null; organization_name: string;
}
export interface Publication {
  id: string; publication_key: string; version_number: number; publication_number: string;
  title: string; description: string | null; status: "draft" | "active" | "replaced" | "withdrawn";
  effective_at: string | null; change_notes: string | null; item_count: number; items: PublicationItem[];
}
export interface PublicationCandidate {
  observation_id: string; dataset_version_id: string; indicator_code: string; indicator_name: string;
  period_id: string; period_label: string; numeric_value: string | null; text_value: string | null;
  unit_name: string; unit_symbol: string | null; organization_name: string; approved_at: string;
}

export interface NotificationItem { id: string; notification_type: string; title: string; message: string; entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string }
export interface AuditEvent { id: string; actor_id: string | null; actor_name: string | null; organization_id: string | null; organization_name: string | null; event_type: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; request_id: string | null; ip_address: string | null; occurred_at: string }

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: Array<Record<string, unknown>>;
  };
}
