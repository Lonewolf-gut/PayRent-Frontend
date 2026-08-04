const STORAGE_PREFIX = "payforme-nav-seen";

function storageKey(userId: string, sectionKey: string) {
  return `${STORAGE_PREFIX}:${userId}:${sectionKey}`;
}

function readSeenIds(userId: string, sectionKey: string): Set<string> {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userId, sectionKey));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(userId: string, sectionKey: string, ids: Set<string>) {
  localStorage.setItem(storageKey(userId, sectionKey), JSON.stringify([...ids]));
}

export function markNavItemsSeen(userId: string, sectionKey: string, itemIds: string[]) {
  if (!userId || !itemIds.length) return;
  const seen = readSeenIds(userId, sectionKey);
  let changed = false;
  for (const id of itemIds) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (changed) writeSeenIds(userId, sectionKey, seen);
}

export function countUnseenNavItems(
  userId: string,
  sectionKey: string,
  itemIds: string[]
) {
  if (!userId) return itemIds.length;
  const seen = readSeenIds(userId, sectionKey);
  return itemIds.filter((id) => !seen.has(id)).length;
}

export function extractNavItemIds(
  data: unknown,
  statuses?: string[]
): string[] {
  if (typeof data === "object" && data !== null && "documents" in data) {
    const documents = (data as { documents?: Array<{ id?: string; status?: string }> })
      .documents ?? [];
    return documents
      .filter((doc) => !statuses?.length || (doc.status && statuses.includes(doc.status)))
      .map((doc) => doc.id)
      .filter((id): id is string => Boolean(id));
  }

  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => {
      if (!statuses?.length) return true;
      return (
        typeof item === "object" &&
        item !== null &&
        "status" in item &&
        statuses.includes(String((item as { status: string }).status))
      );
    })
    .map((item) => {
      if (typeof item === "object" && item !== null && "id" in item) {
        return String((item as { id: string }).id);
      }
      return "";
    })
    .filter(Boolean);
}
