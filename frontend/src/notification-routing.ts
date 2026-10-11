import type { MenuItem, NotificationItem } from "./types";

function hasMenuRoute(menu: MenuItem[], route: string): boolean {
  return menu.some((item) => item.route_name === route || hasMenuRoute(item.children ?? [], route));
}

export function notificationDestination(item: NotificationItem, permissions: string[], menu: MenuItem[]): string {
  const entity = item.entity_id ? `?id=${encodeURIComponent(item.entity_id)}` : "";
  if (item.notification_type === "user.registration_requested" && hasMenuRoute(menu, "/admin/users")) return `/admin/users${entity}`;
  if (item.notification_type === "user.registration_approved") return hasMenuRoute(menu, "/operations") ? "/operations" : "/notifications";
  if ((item.entity_type === "connector_run" || item.entity_type === "data_source" || item.entity_type === "indicator_source_mapping" || item.notification_type.startsWith("connector.")) && hasMenuRoute(menu, "/connectors")) return `/connectors${entity}`;
  if ((item.entity_type === "data_batch" || item.notification_type.startsWith("submission.")) && permissions.includes("submission.review") && hasMenuRoute(menu, "/reviews")) return `/reviews${entity}`;
  if ((item.entity_type === "data_batch" || item.notification_type.startsWith("submission.")) && permissions.includes("submission.view") && hasMenuRoute(menu, "/submissions")) return `/submissions${entity}`;
  if ((item.entity_type === "publication" || item.notification_type.startsWith("publication.")) && permissions.includes("publication.view") && hasMenuRoute(menu, "/publications")) return `/publications${entity}`;
  if ((item.entity_type === "publication" || item.notification_type.startsWith("publication.")) && permissions.includes("executive_dashboard.view") && hasMenuRoute(menu, "/executive")) return "/executive";
  if (item.entity_type === "indicator_version" || item.notification_type.startsWith("indicator.")) return permissions.includes("indicator.view") && hasMenuRoute(menu, "/governance/indicators") ? `/governance/indicators${entity}` : "/notifications";
  if (item.entity_type === "category" || item.notification_type.startsWith("category.")) return permissions.includes("category.view") && hasMenuRoute(menu, "/governance/categories") ? `/governance/categories${entity}` : "/notifications";
  return "/notifications";
}
