import { getProfileDisplayName } from "@/lib/utils/display-name";

export type KycHistoryItem = {
  id: string;
  type: string;
  status: string;
  verifiedAt?: string | null;
  providerName?: string | null;
  userId?: string;
  user?: {
    id?: string;
    email: string;
    role: string;
    tenant?: { fullName?: string | null; companyName?: string | null } | null;
    landlord?: { fullName?: string | null; companyName?: string | null } | null;
    lender?: { fullName?: string | null; institutionName?: string | null } | null;
    agentProfile?: { fullName?: string | null } | null;
  };
  documents?: Array<{ id: string; documentType: string; fileName: string }>;
  data?: Record<string, unknown>;
};

export type KycHistoryUserGroup = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  items: KycHistoryItem[];
  latestApprovedAt: string | null;
  types: string[];
};

function getItemUserId(item: KycHistoryItem) {
  return item.userId ?? item.user?.id ?? item.user?.email ?? item.id;
}

function getItemDisplayName(item: KycHistoryItem) {
  const profile =
    item.user?.tenant ??
    item.user?.landlord ??
    item.user?.lender ??
    item.user?.agentProfile;

  return (
    getProfileDisplayName({
      entityType: "INDIVIDUAL",
      fullName: profile?.fullName ?? null,
      companyName:
        "companyName" in (profile ?? {})
          ? ((profile as { companyName?: string }).companyName ?? null)
          : (profile as { institutionName?: string })?.institutionName ?? null,
    }) || item.user?.email || "Unknown user"
  );
}

export function groupKycHistoryByUser(history: KycHistoryItem[]): KycHistoryUserGroup[] {
  const groups = new Map<string, KycHistoryUserGroup>();

  for (const item of history) {
    if (item.type === "BANK") continue;

    const userId = getItemUserId(item);
    const existing = groups.get(userId);

    if (existing) {
      existing.items.push(item);
      if (!existing.types.includes(item.type)) existing.types.push(item.type);
      if (
        item.verifiedAt &&
        (!existing.latestApprovedAt || item.verifiedAt > existing.latestApprovedAt)
      ) {
        existing.latestApprovedAt = item.verifiedAt;
      }
      continue;
    }

    groups.set(userId, {
      userId,
      displayName: getItemDisplayName(item),
      email: item.user?.email ?? "—",
      role: item.user?.role ?? "—",
      items: [item],
      latestApprovedAt: item.verifiedAt ?? null,
      types: [item.type],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.latestApprovedAt ? new Date(a.latestApprovedAt).getTime() : 0;
    const bTime = b.latestApprovedAt ? new Date(b.latestApprovedAt).getTime() : 0;
    return bTime - aTime;
  });
}
