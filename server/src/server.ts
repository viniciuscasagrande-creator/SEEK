import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { coreRouter } from './routes/core.routes.js';
import { seekAiRouter } from './routes/seekAi.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API SEEK
app.use('/api/auth', authRouter);
app.use('/api/core', coreRouter);
app.use('/api/seek-ai', seekAiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'SEEK — Gestão Corporativa Integrada',
    version: '1.0.0-PRO',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[SEEK Core API] Servidor corporativo rodando com sucesso em http://localhost:${PORT}`);
});
