type BadgeCountResponse = {
  success?: boolean;
  data?: unknown;
};

export function parseSidebarBadgeCount(
  json: BadgeCountResponse,
  statuses?: string[]
) {
  const data = json.data;

  if (typeof data === "object" && data !== null && "count" in data) {
    const count = Number((data as { count?: number }).count ?? 0);
    if (!Number.isNaN(count)) return count;
  }

  if (typeof data === "object" && data !== null && "documents" in data) {
    const documents = (data as { documents?: Array<{ status?: string }> }).documents ?? [];
    if (statuses?.length) {
      return documents.filter(
        (item) => item.status && statuses.includes(item.status)
      ).length;
    }
    return documents.length;
  }

  if (Array.isArray(data)) {
    if (statuses?.length) {
      return data.filter(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "status" in item &&
          statuses.includes(String((item as { status: string }).status))
      ).length;
    }
    return data.length;
  }

  if (typeof data === "object" && data !== null && "total" in data) {
    return Number((data as { total?: number }).total ?? 0);
  }

  return Number(data ?? 0);
}
