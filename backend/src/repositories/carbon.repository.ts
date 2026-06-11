import { prisma } from './prisma.js';
import { CarbonLog, UserProfile } from 'shared';

export class CarbonRepository {
  async createLog(userId: string, data: Omit<CarbonLog, 'id' | 'userId' | 'createdAt'>): Promise<CarbonLog> {
    const log = await prisma.carbonLog.create({
      data: {
        userId,
        category: data.category,
        value: data.value,
        unit: data.unit,
        emissionsKg: data.emissionsKg
      }
    });

    return {
      id: log.id,
      userId: log.userId,
      category: log.category as any,
      value: log.value,
      unit: log.unit,
      emissionsKg: log.emissionsKg,
      createdAt: log.createdAt.toISOString()
    };
  }

  async getLogsByUser(userId: string, start?: Date, end?: Date): Promise<CarbonLog[]> {
    const whereClause: any = { userId };
    if (start || end) {
      whereClause.createdAt = {};
      if (start) whereClause.createdAt.gte = start;
      if (end) whereClause.createdAt.lte = end;
    }

    const logs = await prisma.carbonLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      category: log.category as any,
      value: log.value,
      unit: log.unit,
      emissionsKg: log.emissionsKg,
      createdAt: log.createdAt.toISOString()
    }));
  }

  async getCategoryAverages(userId: string): Promise<Record<string, number>> {
    const result = await prisma.carbonLog.groupBy({
      by: ['category'],
      where: { userId },
      _sum: {
        emissionsKg: true
      }
    });

    const averages: Record<string, number> = {
      Utilities: 0,
      Transport: 0,
      Diet: 0,
      Shopping: 0
    };

    result.forEach((row: any) => {
      if (row.category in averages) {
        averages[row.category] = row._sum.emissionsKg || 0;
      }
    });

    return averages;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const p = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!p) return null;

    return {
      id: p.id,
      userId: p.userId,
      location: {
        zipCode: p.zipCode,
        region: p.region
      },
      housing: {
        type: p.housingType as any,
        ownership: p.housingOwnership as any,
        heatingType: p.heatingType as any
      },
      transport: {
        hasEV: p.hasEV,
        hasGasCar: p.hasGasCar,
        commuteDistanceMiles: p.commuteDistance,
        primaryMode: p.primaryMode as any
      },
      diet: p.diet as any,
      historicalAverages: {
        utilityMonthlyKg: 0, // Computed dynamically in services
        transportMonthlyKg: 0,
        dietMonthlyKg: 0,
        shoppingMonthlyKg: 0
      },
      behavior: {
        completedActions: JSON.parse(p.completedActions),
        skippedActions: JSON.parse(p.skippedActions),
        consecutiveLogDays: p.consecutiveLogs
      },
      preferences: {
        focusArea: p.focusArea as any
      }
    };
  }

  async createUserProfile(userId: string, data: Omit<UserProfile, 'id' | 'userId' | 'historicalAverages'>): Promise<UserProfile> {
    const p = await prisma.userProfile.create({
      data: {
        userId,
        zipCode: data.location.zipCode,
        region: data.location.region,
        housingType: data.housing.type,
        housingOwnership: data.housing.ownership,
        heatingType: data.housing.heatingType,
        hasEV: data.transport.hasEV,
        hasGasCar: data.transport.hasGasCar,
        commuteDistance: data.transport.commuteDistanceMiles,
        primaryMode: data.transport.primaryMode,
        diet: data.diet,
        focusArea: data.preferences.focusArea || 'general',
        completedActions: JSON.stringify(data.behavior.completedActions),
        skippedActions: JSON.stringify(data.behavior.skippedActions),
        consecutiveLogs: data.behavior.consecutiveLogDays
      }
    });

    return {
      id: p.id,
      userId: p.userId,
      location: { zipCode: p.zipCode, region: p.region },
      housing: { type: p.housingType as any, ownership: p.housingOwnership as any, heatingType: p.heatingType as any },
      transport: { hasEV: p.hasEV, hasGasCar: p.hasGasCar, commuteDistanceMiles: p.commuteDistance, primaryMode: p.primaryMode as any },
      diet: p.diet as any,
      historicalAverages: { utilityMonthlyKg: 0, transportMonthlyKg: 0, dietMonthlyKg: 0, shoppingMonthlyKg: 0 },
      behavior: { completedActions: JSON.parse(p.completedActions), skippedActions: JSON.parse(p.skippedActions), consecutiveLogDays: p.consecutiveLogs },
      preferences: { focusArea: p.focusArea as any }
    };
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const updateData: any = {};
    if (data.location) {
      if (data.location.zipCode) updateData.zipCode = data.location.zipCode;
      if (data.location.region) updateData.region = data.location.region;
    }
    if (data.housing) {
      if (data.housing.type) updateData.housingType = data.housing.type;
      if (data.housing.ownership) updateData.housingOwnership = data.housing.ownership;
      if (data.housing.heatingType) updateData.heatingType = data.housing.heatingType;
    }
    if (data.transport) {
      if (data.transport.hasEV !== undefined) updateData.hasEV = data.transport.hasEV;
      if (data.transport.hasGasCar !== undefined) updateData.hasGasCar = data.transport.hasGasCar;
      if (data.transport.commuteDistanceMiles !== undefined) updateData.commuteDistance = data.transport.commuteDistanceMiles;
      if (data.transport.primaryMode) updateData.primaryMode = data.transport.primaryMode;
    }
    if (data.diet) updateData.diet = data.diet;
    if (data.preferences?.focusArea) updateData.focusArea = data.preferences.focusArea;
    if (data.behavior) {
      if (data.behavior.completedActions) updateData.completedActions = JSON.stringify(data.behavior.completedActions);
      if (data.behavior.skippedActions) updateData.skippedActions = JSON.stringify(data.behavior.skippedActions);
      if (data.behavior.consecutiveLogDays !== undefined) updateData.consecutiveLogs = data.behavior.consecutiveLogDays;
    }

    const p = await prisma.userProfile.update({
      where: { userId },
      data: updateData
    });

    return {
      id: p.id,
      userId: p.userId,
      location: { zipCode: p.zipCode, region: p.region },
      housing: { type: p.housingType as any, ownership: p.housingOwnership as any, heatingType: p.heatingType as any },
      transport: { hasEV: p.hasEV, hasGasCar: p.hasGasCar, commuteDistanceMiles: p.commuteDistance, primaryMode: p.primaryMode as any },
      diet: p.diet as any,
      historicalAverages: { utilityMonthlyKg: 0, transportMonthlyKg: 0, dietMonthlyKg: 0, shoppingMonthlyKg: 0 },
      behavior: { completedActions: JSON.parse(p.completedActions), skippedActions: JSON.parse(p.skippedActions), consecutiveLogDays: p.consecutiveLogs },
      preferences: { focusArea: p.focusArea as any }
    };
  }
}
