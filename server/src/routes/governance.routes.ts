import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const governanceRouter = Router();

// Lista Matriz de Riscos & Compliance
governanceRouter.get('/risks', (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM risks_compliance WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY code ASC';
    const rows = db.prepare(query).all(...params) as any[];

    const risks = rows.map(r => ({
      id: r.id,
      code: r.code,
      category: r.category,
      title: r.title,
      description: r.description,
      probability: r.probability,
      impact: r.impact,
      riskLevel: r.risk_level,
      mitigationPlan: r.mitigation_plan,
      status: r.status
    }));

    return res.json({ total: risks.length, risks });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro de Risco Corporativo / LGPD
governanceRouter.post('/risks', (req: Request, res: Response) => {
  try {
    const { title, category, description, probability, impact, mitigationPlan, userName, userRole } = req.body;

    if (!title || !category || !mitigationPlan) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, category, mitigationPlan.' });
    }

    const id = `rsk-${Date.now()}`;
    const code = `RSK-${category.substring(0, 3)}-0${Math.floor(10 + Math.random() * 89)}`;
    const prob = probability || 'MEDIA';
    const imp = impact || 'MEDIO';
    const riskLevel = prob === 'ALTA' || imp === 'ALTO' ? 'CRITICO' : prob === 'MEDIA' ? 'ALTO' : 'MEDIO';

    db.prepare(`
      INSERT INTO risks_compliance (id, code, category, title, description, probability, impact, risk_level, mitigation_plan, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'MONITORADO')
    `).run(id, code, category, title, description || '', prob, imp, riskLevel, mitigationPlan);

    logAudit(
      userName || 'Compliance Officer',
      userRole || 'Auditoria',
      'CREATE',
      'Governança & Riscos',
      `Risco ${code}`,
      `Cadastrado apontamento de risco (${category}): "${title}" [Nível: ${riskLevel}]`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      risk: { id, code, title, category, riskLevel }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
