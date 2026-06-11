import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../repositories/prisma.js';
import { CarbonRepository } from '../repositories/carbon.repository.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const carbonRepo = new CarbonRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'supersafesecretkey_carbon_123';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, location, housing, transport, diet, preferences } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Transaction to create User and Profile
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash
        }
      });

      await tx.userProfile.create({
        data: {
          userId: user.id,
          zipCode: location?.zipCode || '94043',
          region: location?.region || 'CA',
          housingType: housing?.type || 'apartment',
          housingOwnership: housing?.ownership || 'rent',
          heatingType: housing?.heatingType || 'electric',
          hasEV: transport?.hasEV || false,
          hasGasCar: transport?.hasGasCar || false,
          commuteDistance: transport?.commuteDistanceMiles || 10,
          primaryMode: transport?.primaryMode || 'transit',
          diet: diet || 'omnivore',
          focusArea: preferences?.focusArea || 'general'
        }
      });

      return user;
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, userId: newUser.id, email: newUser.email });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, email: user.email });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = await carbonRepo.getUserProfile(userId);
    
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Dynamic aggregation of category averages to populate historicalAverages
    const averages = await carbonRepo.getCategoryAverages(userId);
    profile.historicalAverages = {
      utilityMonthlyKg: averages.Utilities || 0,
      transportMonthlyKg: averages.Transport || 0,
      dietMonthlyKg: averages.Diet || 0,
      shoppingMonthlyKg: averages.Shopping || 0
    };

    res.json(profile);
  } catch (err: any) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const updated = await carbonRepo.updateUserProfile(userId, req.body);
    
    // Add dynamically calculated averages
    const averages = await carbonRepo.getCategoryAverages(userId);
    updated.historicalAverages = {
      utilityMonthlyKg: averages.Utilities || 0,
      transportMonthlyKg: averages.Transport || 0,
      dietMonthlyKg: averages.Diet || 0,
      shoppingMonthlyKg: averages.Shopping || 0
    };

    res.json(updated);
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
