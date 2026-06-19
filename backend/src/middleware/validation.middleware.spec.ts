import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  validate, 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  logEmissionsSchema, 
  updateActionSchema, 
  chatSchema 
} from './validation.middleware.js';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: any = vi.fn();
  let statusMock = vi.fn();
  let jsonMock = vi.fn();

  beforeEach(() => {
    mockRequest = {};
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    nextFunction = vi.fn() as any;
  });

  describe('validate wrapper', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      age: z.number().int().positive()
    });

    it('should call next if validation succeeds', async () => {
      mockRequest.body = { name: 'John Doe', age: 30 };
      const middleware = validate(testSchema);

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should return 400 with details if validation fails', async () => {
      mockRequest.body = { name: 'Jo', age: -5 };
      const middleware = validate(testSchema);

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'age' })
          ])
        })
      );
    });
  });

  describe('Schemas Validation', () => {
    describe('loginSchema', () => {
      it('should validate valid logins', () => {
        const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password123' });
        expect(result.success).toBe(true);
      });

      it('should reject invalid emails', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
        expect(result.success).toBe(false);
      });

      it('should reject empty passwords', () => {
        const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
        expect(result.success).toBe(false);
      });
    });

    describe('logEmissionsSchema', () => {
      it('should validate valid emissions logs', () => {
        const result = logEmissionsSchema.safeParse({
          category: 'Transport',
          value: 15.5,
          unit: 'miles'
        });
        expect(result.success).toBe(true);
      });

      it('should reject negative or zero values', () => {
        const negativeRes = logEmissionsSchema.safeParse({
          category: 'Transport',
          value: -1,
          unit: 'miles'
        });
        expect(negativeRes.success).toBe(false);

        const zeroRes = logEmissionsSchema.safeParse({
          category: 'Transport',
          value: 0,
          unit: 'miles'
        });
        expect(zeroRes.success).toBe(false);
      });

      it('should reject invalid categories', () => {
        const result = logEmissionsSchema.safeParse({
          category: 'Flights',
          value: 100,
          unit: 'flights'
        });
        expect(result.success).toBe(false);
      });
    });

    describe('updateActionSchema', () => {
      it('should validate complete/skip action triggers', () => {
        const completeResult = updateActionSchema.safeParse({ actionId: 'action-1', type: 'complete' });
        expect(completeResult.success).toBe(true);

        const skipResult = updateActionSchema.safeParse({ actionId: 'action-2', type: 'skip' });
        expect(skipResult.success).toBe(true);
      });

      it('should reject invalid types', () => {
        const result = updateActionSchema.safeParse({ actionId: 'action-1', type: 'postpone' });
        expect(result.success).toBe(false);
      });
    });

    describe('chatSchema', () => {
      it('should validate correct chat request payload', () => {
        const result = chatSchema.safeParse({
          message: 'Hello, what can I do?',
          history: [{ role: 'user', text: 'Hi' }]
        });
        expect(result.success).toBe(true);
      });

      it('should reject empty message', () => {
        const result = chatSchema.safeParse({
          message: ''
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
