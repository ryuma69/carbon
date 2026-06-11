import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import middlewares
import { requireAuth } from './middleware/auth.middleware.js';

// Import controllers
import * as userController from './controllers/user.controller.js';
import * as carbonController from './controllers/carbon.controller.js';
import * as assistantController from './controllers/assistant.controller.js';

dotenv.config();

const app = express();

// Enable CORS for frontend requests
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Public Auth routes
app.post('/api/users/register', userController.register);
app.post('/api/users/login', userController.login);

// Protected Profile routes
app.get('/api/users/profile', requireAuth as any, userController.getProfile as any);
app.put('/api/users/profile', requireAuth as any, userController.updateProfile as any);

// Protected Carbon metrics routes
app.post('/api/carbon/log', requireAuth as any, carbonController.logEmissions as any);
app.get('/api/carbon/logs', requireAuth as any, carbonController.getLogs as any);
app.get('/api/carbon/summary', requireAuth as any, carbonController.getDashboardSummary as any);
app.get('/api/carbon/recommendations', requireAuth as any, carbonController.getRecommendations as any);
app.post('/api/carbon/recommendation/action', requireAuth as any, carbonController.updateActionState as any);
app.get('/api/carbon/grid-forecast', requireAuth as any, carbonController.getGridForecast as any);

// Protected Assistant AI routes
app.post('/api/assistant/chat', requireAuth as any, assistantController.chat as any);
app.post('/api/assistant/scan-bill', requireAuth as any, assistantController.scanBill as any);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'An unexpected database or server error occurred.' });
});

export default app;
