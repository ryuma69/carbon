import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { CarbonRepository } from '../repositories/carbon.repository.js';
import { CarbonCalculatorService } from '../services/carbon.service.js';
import { RecommendationService } from '../services/recommendation.service.js';

const carbonRepo = new CarbonRepository();
const carbonCalc = new CarbonCalculatorService();
const recService = new RecommendationService();

export const logEmissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { category, value, unit } = req.body;

    if (!category || value === undefined || !unit) {
      res.status(400).json({ error: 'Missing required carbon log parameters' });
      return;
    }

    const emissionsKg = carbonCalc.calculateEmissions({ category, value, unit });
    const log = await carbonRepo.createLog(userId, { category, value, unit, emissionsKg });

    res.status(201).json(log);
  } catch (err: any) {
    console.error('Log emissions error:', err);
    res.status(500).json({ error: 'Failed to record carbon event' });
  }
};

export const getLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const logs = await carbonRepo.getLogsByUser(userId);
    res.json(logs);
  } catch (err: any) {
    console.error('Get logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
};

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const averages = await carbonRepo.getCategoryAverages(userId);
    const breakdown = await carbonCalc.identifyMajorSources(userId);
    const forecast = await carbonCalc.predictTrend(userId);

    res.json({
      averages,
      breakdown,
      forecast
    });
  } catch (err: any) {
    console.error('Get dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to calculate footprint analytics' });
  }
};

export const getRecommendations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await carbonRepo.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Pre-populate category averages in profile object
    const averages = await carbonRepo.getCategoryAverages(userId);
    profile.historicalAverages = {
      utilityMonthlyKg: averages.Utilities || 0,
      transportMonthlyKg: averages.Transport || 0,
      dietMonthlyKg: averages.Diet || 0,
      shoppingMonthlyKg: averages.Shopping || 0
    };

    const recommendations = await recService.generateRecommendations(profile);
    res.json(recommendations);
  } catch (err: any) {
    console.error('Get recommendations error:', err);
    res.status(500).json({ error: 'Failed to compile recommendations list' });
  }
};

export const updateActionState = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { actionId, type } = req.body; // type: 'complete' | 'skip'

    if (!actionId || !type || (type !== 'complete' && type !== 'skip')) {
      res.status(400).json({ error: 'Invalid parameters. Need actionId and type ("complete" | "skip")' });
      return;
    }

    const profile = await carbonRepo.getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    const updatedProfile = await recService.adjustBehavioralWeights(profile, actionId, type);
    res.json(updatedProfile);
  } catch (err: any) {
    console.error('Update action state error:', err);
    res.status(500).json({ error: 'Failed to update action list state' });
  }
};

export const getGridForecast = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await carbonRepo.getUserProfile(userId);
    const zipCode = profile?.location.zipCode || '94043';

    const forecast = await carbonCalc.getGridForecast(zipCode);
    const recommendation = await carbonCalc.recommendBestEnergyHour(zipCode);

    res.json({
      forecast,
      recommendation
    });
  } catch (err: any) {
    console.error('Get grid forecast error:', err);
    res.status(500).json({ error: 'Failed to pull electrical grid forecast' });
  }
};
