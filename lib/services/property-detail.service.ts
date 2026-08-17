import { prisma } from "@/lib/db/prisma";
import { propertyRepository } from "@/lib/repositories/property.repository";
import type { PropertyType, UserRole } from "@prisma/client";
import { RESIDENTIAL_TYPES } from "@/lib/subscription-limits";
import { withResolvedPropertyListImages } from "@/lib/utils/property-media";

type PropertyViewer = {
  userId: string;
  role: UserRole;
};

export class PropertyDetailService {
  async getDetail(propertyId: string, viewer?: PropertyViewer | null) {
    const property = await propertyRepository.findById(propertyId);
    if (!property) return null;

    await prisma.propertyView.create({
      data: {
        propertyId,
        userId: viewer?.userId ?? undefined,
      },
    });

    const [saveCount, viewCount, similar] = await Promise.all([
      prisma.savedProperty.count({ where: { propertyId } }),
      prisma.propertyView.count({ where: { propertyId } }),
      this.findSimilar(property),
    ]);

    const landlordUser = property.landlord?.user;
    const agentUser = property.assignedAgent?.user;

    let promotionStatus: "available" | "yours" | "claimed_by_other" | null = null;
    if (viewer?.role === "MARKETER") {
      const agent = await prisma.agentProfile.findUnique({
        where: { userId: viewer.userId },
        select: { id: true },
      });
      if (agent) {
        promotionStatus =
          property.agentUserId === agent.id
            ? "yours"
            : property.agentUserId
              ? "claimed_by_other"
              : "available";
      }
    }

    return {
      ...property,
      promotionStatus,
      stats: {
        saveCount,
        viewCount,
        listedAt: property.createdAt,
      },
      contacts: {
        landlord: landlordUser
          ? {
              userId: property.landlord.userId,
              name: property.landlord.fullName,
              email: landlordUser.email,
              phone: landlordUser.phone,
              image: landlordUser.image,
            }
          : null,
        agent: property.assignedAgent
          ? {
              userId: agentUser?.id ?? null,
              name: property.assignedAgent.fullName,
              email: agentUser?.email ?? property.agent?.email ?? null,
              phone: agentUser?.phone ?? property.agent?.phone ?? null,
              image: agentUser?.image ?? property.agent?.image ?? null,
            }
          : property.agent
            ? {
                userId: null,
                name: property.agent.name,
                email: property.agent.email,
                phone: property.agent.phone,
                image: property.agent.image,
              }
            : null,
      },
      similar,
    };
  }

  private async findSimilar(property: {
    id: string;
    propertyType: PropertyType;
    region?: string | null;
    city?: string | null;
    monthlyRent: { toString(): string } | number;
  }) {
    const rent = Number(property.monthlyRent);
    const rentMin = rent * 0.75;
    const rentMax = rent * 1.25;
    const isResidential = RESIDENTIAL_TYPES.includes(property.propertyType);

    return withResolvedPropertyListImages(
      await prisma.property.findMany({
      where: {
        id: { not: property.id },
        status: "ACTIVE",
        propertyType: isResidential
          ? { in: RESIDENTIAL_TYPES }
          : property.propertyType,
        monthlyRent: { gte: rentMin, lte: rentMax },
        ...(property.region ? { region: property.region } : {}),
        ...(property.city ? { city: property.city } : {}),
      },
      include: {
        images: { take: 1, orderBy: { order: "asc" } },
      },
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
      take: 4,
    })
    );
  }
}

export const propertyDetailService = new PropertyDetailService();
