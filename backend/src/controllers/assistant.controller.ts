import { Response } from 'express';
import multer from 'multer';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { GeminiService } from '../services/gemini.service.js';

const geminiService = new GeminiService();

// Multipurpose volatile memory buffer config (5MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('bill');

export const chat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { history, message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const reply = await geminiService.processChatMessage(userId, history || [], message);
    res.json(reply);
  } catch (err: any) {
    console.error('Chat controller error:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
};

export const scanBill = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  upload(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: 'File upload failed or file size exceeds 5MB limit' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No invoice file uploaded' });
      return;
    }

    try {
      const userId = req.user!.id;
      const parsedData = await geminiService.parseUtilityBill(
        userId,
        req.file.buffer,
        req.file.mimetype
      );

      // Return parsed data to client for validation before writing to log
      res.json(parsedData);
    } catch (parseErr: any) {
      console.error('Bill OCR controller error:', parseErr);
      res.status(500).json({ error: 'Failed to parse utility invoice contents' });
    }
  });
};
