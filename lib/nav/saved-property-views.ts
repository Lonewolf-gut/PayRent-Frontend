import type { QueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "payforme-viewed-saved-properties";
export const SAVED_PROPERTY_COUNT_QUERY_KEY = ["saved-property-count"] as const;

function readViewedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeViewedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function markSavedPropertyViewed(propertyId: string) {
  const viewed = readViewedIds();
  if (viewed.has(propertyId)) return false;
  viewed.add(propertyId);
  writeViewedIds(viewed);
  return true;
}

export function clearSavedPropertyViewed(propertyId: string) {
  const viewed = readViewedIds();
  if (!viewed.has(propertyId)) return false;
  viewed.delete(propertyId);
  writeViewedIds(viewed);
  return true;
}

export function countUnviewedSavedProperties(propertyIds: string[]) {
  const viewed = readViewedIds();
  return propertyIds.filter((id) => !viewed.has(id)).length;
}

export function extractSavedPropertyIds(
  items: Array<{ propertyId?: string; property?: { id: string } }>
) {
  return items
    .map((item) => item.propertyId ?? item.property?.id)
    .filter((id): id is string => Boolean(id));
}

export async function fetchSavedPropertyCount() {
  const res = await fetch("/api/properties/saved");
  const json = await res.json();
  if (!json.success) return 0;
  return extractSavedPropertyIds(json.data ?? []).length;
}

export function setSavedPropertyCountQuery(queryClient: QueryClient, count: number) {
  queryClient.setQueryData(SAVED_PROPERTY_COUNT_QUERY_KEY, count);
}

export async function refreshSavedPropertyCountQuery(queryClient: QueryClient) {
  const count = await fetchSavedPropertyCount();
  setSavedPropertyCountQuery(queryClient, count);
  return count;
}

export function markSavedPropertyViewedAndSyncCount(
  queryClient: QueryClient,
  propertyIds: string[],
  propertyId: string
) {
  markSavedPropertyViewed(propertyId);
  const nextCount = countUnviewedSavedProperties(
    propertyIds.filter((id) => id !== propertyId)
  );
  setSavedPropertyCountQuery(queryClient, nextCount);
  return nextCount;
}

/** @deprecated Use fetchSavedPropertyCount — navbar shows total saved listings. */
export const fetchUnviewedSavedCount = fetchSavedPropertyCount;
