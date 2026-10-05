import { Router, Request, Response } from 'express';
import { db } from '../db.js';

export const coreRouter = Router();

coreRouter.get('/companies', (_req: Request, res: Response) => {
  try {
    const companies = db.prepare('SELECT * FROM companies WHERE active = 1 ORDER BY is_holding DESC, trade_name ASC').all();
    return res.json({ companies });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/branches', (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    let branches;
    if (companyId) {
      branches = db.prepare('SELECT * FROM branches WHERE company_id = ? AND active = 1 ORDER BY is_headquarter DESC, name ASC').all(companyId);
    } else {
      branches = db.prepare('SELECT * FROM branches WHERE active = 1 ORDER BY is_headquarter DESC, name ASC').all();
    }
    return res.json({ branches });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/departments', (req: Request, res: Response) => {
  try {
    const departments = db.prepare('SELECT * FROM departments WHERE active = 1 ORDER BY name ASC').all();
    return res.json({ departments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/cost-centers', (req: Request, res: Response) => {
  try {
    const costCenters = db.prepare('SELECT * FROM cost_centers WHERE active = 1 ORDER BY code ASC').all();
    return res.json({ costCenters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/parameters', (_req: Request, res: Response) => {
  try {
    const parameters = db.prepare('SELECT * FROM corporate_parameters').all();
    return res.json({ parameters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/audit-logs', (_req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200').all();
    return res.json({ total: logs.length, logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
