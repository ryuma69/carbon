import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Reusable validation helper
export const validate = (schema: z.AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      res.status(400).json({ error: 'Invalid request data' });
    }
  };
};

// Registration validation schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  location: z.object({
    zipCode: z.string().min(1, 'Zip code is required'),
    region: z.string().min(1, 'Region is required')
  }).optional(),
  housing: z.object({
    type: z.enum(['apartment', 'house']),
    ownership: z.enum(['rent', 'own']),
    heatingType: z.enum(['electric', 'gas', 'oil'])
  }).optional(),
  transport: z.object({
    hasEV: z.boolean(),
    hasGasCar: z.boolean(),
    commuteDistanceMiles: z.number().nonnegative('Commute distance must be zero or positive'),
    primaryMode: z.enum(['driving', 'transit', 'walking_biking'])
  }).optional(),
  diet: z.enum(['vegan', 'vegetarian', 'pescatarian', 'omnivore', 'heavy_meat']).optional(),
  preferences: z.object({
    focusArea: z.enum(['general', 'cost_saving', 'carbon_only', 'dietary'])
  }).optional()
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

// Profile update validation schema
export const updateProfileSchema = z.object({
  location: z.object({
    zipCode: z.string().optional(),
    region: z.string().optional()
  }).optional(),
  housing: z.object({
    type: z.enum(['apartment', 'house']).optional(),
    ownership: z.enum(['rent', 'own']).optional(),
    heatingType: z.enum(['electric', 'gas', 'oil']).optional()
  }).optional(),
  transport: z.object({
    hasEV: z.boolean().optional(),
    hasGasCar: z.boolean().optional(),
    commuteDistanceMiles: z.number().nonnegative().optional(),
    primaryMode: z.enum(['driving', 'transit', 'walking_biking']).optional()
  }).optional(),
  diet: z.enum(['vegan', 'vegetarian', 'pescatarian', 'omnivore', 'heavy_meat']).optional(),
  preferences: z.object({
    focusArea: z.enum(['general', 'cost_saving', 'carbon_only', 'dietary']).optional()
  }).optional(),
  behavior: z.object({
    completedActions: z.array(z.string()).optional(),
    skippedActions: z.array(z.string()).optional(),
    consecutiveLogDays: z.number().int().nonnegative().optional()
  }).optional()
});

// Log emissions validation schema
export const logEmissionsSchema = z.object({
  category: z.enum(['Utilities', 'Transport', 'Diet', 'Shopping']),
  value: z.number().positive('Logged value must be greater than zero'),
  unit: z.string().min(1, 'Unit identifier is required')
});

// Recommendation action validation schema (complete/skip)
export const updateActionSchema = z.object({
  actionId: z.string().min(1, 'Action ID is required'),
  type: z.enum(['complete', 'skip'])
});

// Assistant chat validation schema
export const chatSchema = z.object({
  message: z.string().min(1, 'Chat message cannot be empty'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      text: z.string().min(1)
    })
  ).optional()
});
