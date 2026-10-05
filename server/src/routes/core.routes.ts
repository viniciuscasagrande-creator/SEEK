import { Router, Request, Response } from 'express';
import { companies, branches, corporateParameters, auditLogs } from '../db.js';

export const coreRouter = Router();

coreRouter.get('/companies', (_req: Request, res: Response) => {
  return res.json({ companies });
});

coreRouter.get('/branches', (req: Request, res: Response) => {
  const { companyId } = req.query;
  if (companyId) {
    return res.json({ branches: branches.filter(b => b.companyId === companyId) });
  }
  return res.json({ branches });
});

coreRouter.get('/parameters', (_req: Request, res: Response) => {
  return res.json({ parameters: corporateParameters });
});

coreRouter.get('/audit-logs', (_req: Request, res: Response) => {
  return res.json({ total: auditLogs.length, logs: auditLogs });
});
