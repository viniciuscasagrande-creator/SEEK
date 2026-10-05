import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { coreRouter } from './routes/core.routes.js';
import { financeRouter } from './routes/finance.routes.js';
import { crmRouter } from './routes/crm.routes.js';
import { workflowRouter } from './routes/workflow.routes.js';
import { seekAiRouter } from './routes/seekAi.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API SEEK V1 (Hiper Pacote 2 Operacional)
app.use('/api/auth', authRouter);
app.use('/api/core', coreRouter);
app.use('/api/finance', financeRouter);
app.use('/api/crm', crmRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/seek-ai', seekAiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'SEEK — Gestão Corporativa Integrada',
    version: '1.2.0-OPERACIONAL',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[SEEK Core API] Servidor corporativo operacional rodando em http://localhost:${PORT}`);
});
