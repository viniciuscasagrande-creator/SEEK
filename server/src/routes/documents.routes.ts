import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const documentsRouter = Router();

// Lista Documentos Corporativos (GED)
documentsRouter.get('/', (req: Request, res: Response) => {
  try {
    const { category, department } = req.query;
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (department && department !== 'ALL') {
      query += ' AND department = ?';
      params.push(department);
    }

    query += ' ORDER BY updated_at DESC';
    const rows = db.prepare(query).all(...params) as any[];

    const documents = rows.map(r => ({
      id: r.id,
      code: r.code,
      title: r.title,
      category: r.category,
      department: r.department,
      version: r.version,
      fileSize: r.file_size,
      accessLevel: r.access_level,
      status: r.status,
      updatedAt: r.updated_at
    }));

    return res.json({ total: documents.length, documents });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro de Novo Documento Corporativo
documentsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { title, category, department, version, accessLevel, userName, userRole } = req.body;

    if (!title || !category || !department) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, category, department.' });
    }

    const id = `doc-${Date.now()}`;
    const code = `DOC-${category.substring(0, 3)}-0${Math.floor(10 + Math.random() * 89)}`;
    const ver = version || 'v1.0';
    const acc = accessLevel || 'CORPORATIVO';

    db.prepare(`
      INSERT INTO documents (id, code, title, category, department, version, file_size, access_level, status)
      VALUES (?, ?, ?, ?, ?, ?, '1.5 MB', ?, 'VIGENTE')
    `).run(id, code, title, category, department, ver, acc);

    logAudit(
      userName || 'Gestor Documental',
      userRole || 'Governança',
      'CREATE',
      'Documentos & GED',
      `Documento ${code}`,
      `Publicado documento "${title}" (${ver}) para o departamento ${department}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      document: { id, code, title, category, version: ver }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
