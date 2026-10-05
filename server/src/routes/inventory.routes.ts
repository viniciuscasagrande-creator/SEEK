import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

export const inventoryRouter = Router();

// Lista Itens de Estoque & Almoxarifado
inventoryRouter.get('/items', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM inventory_items ORDER BY name ASC').all() as any[];
    const items = rows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category,
      currentStock: r.current_stock,
      minStock: r.min_stock,
      unit: r.unit,
      unitCost: r.unit_cost,
      location: r.location,
      status: r.current_stock <= r.min_stock ? 'BAIXO' : 'NORMAL'
    }));

    return res.json({ total: items.length, items });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Movimentação de Estoque (Entrada / Saída)
inventoryRouter.post('/movements', (req: Request, res: Response) => {
  try {
    const { itemId, type, quantity, reason, requesterName, userName, userRole } = req.body;

    if (!itemId || !type || !quantity) {
      return res.status(400).json({ error: 'Campos obrigatórios: itemId, type, quantity.' });
    }

    const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(itemId) as any;
    if (!item) {
      return res.status(404).json({ error: 'Item de estoque não encontrado.' });
    }

    const qty = parseInt(quantity);
    let newStock = item.current_stock;
    if (type === 'ENTRADA') {
      newStock += qty;
    } else {
      if (item.current_stock < qty) {
        return res.status(400).json({ error: 'Saldo em estoque insuficiente para atender a saída.' });
      }
      newStock -= qty;
    }

    const newStatus = newStock <= item.min_stock ? 'BAIXO' : 'NORMAL';
    db.prepare('UPDATE inventory_items SET current_stock = ?, status = ? WHERE id = ?').run(newStock, newStatus, itemId);

    const movId = `mov-${Date.now()}`;
    const reqName = requesterName || userName || 'Almoxarife';

    db.prepare(`
      INSERT INTO inventory_movements (id, item_id, item_name, type, quantity, reason, requester_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(movId, itemId, item.name, type, qty, reason || 'Movimentação operacional', reqName);

    logAudit(
      reqName,
      userRole || 'Estoque',
      type === 'ENTRADA' ? 'CREATE' : 'UPDATE',
      'Estoque & Almoxarifado',
      `Item ${item.code}`,
      `Movimentação de ${type}: ${qty} ${item.unit} de "${item.name}". Novo saldo: ${newStock}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      itemId,
      newStock,
      status: newStatus
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Lista Ativos Imobilizados (Patrimônio)
inventoryRouter.get('/assets', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM assets ORDER BY tag_number ASC').all() as any[];
    const assets = rows.map(r => ({
      id: r.id,
      tagNumber: r.tag_number,
      description: r.description,
      category: r.category,
      location: r.location,
      responsibleName: r.responsible_name,
      acquisitionCost: r.acquisition_cost,
      currentBookValue: r.current_book_value,
      custodianSigned: Boolean(r.custodian_signed),
      status: r.status
    }));

    const totalAcquisition = assets.reduce((acc, a) => acc + a.acquisitionCost, 0);
    const totalBookValue = assets.reduce((acc, a) => acc + a.currentBookValue, 0);

    return res.json({
      total: assets.length,
      totalAcquisition,
      totalBookValue,
      assets
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastro de Novo Ativo Patrimonial
inventoryRouter.post('/assets', (req: Request, res: Response) => {
  try {
    const { description, category, location, responsibleName, acquisitionCost, userName, userRole } = req.body;

    if (!description || !category || !acquisitionCost) {
      return res.status(400).json({ error: 'Campos obrigatórios: description, category, acquisitionCost.' });
    }

    const id = `ast-${Date.now()}`;
    const tagNumber = `PAT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const cost = parseFloat(acquisitionCost);

    db.prepare(`
      INSERT INTO assets (id, tag_number, description, category, location, responsible_name, acquisition_cost, current_book_value, custodian_signed, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'ATIVO')
    `).run(
      id,
      tagNumber,
      description,
      category,
      location || 'Curitiba Matriz',
      responsibleName || 'Colaborador Ativo',
      cost,
      cost * 0.95 // valor contábil inicial
    );

    logAudit(
      userName || 'Controladoria & Patrimônio',
      userRole || 'Patrimônio',
      'CREATE',
      'Estoque & Patrimônio',
      `Ativo ${tagNumber}`,
      `Tombamento patrimonial: ${description} (R$ ${cost.toFixed(2)}) sob custódia de ${responsibleName}`,
      req.ip || '189.44.120.10'
    );

    return res.status(201).json({
      success: true,
      asset: {
        id,
        tagNumber,
        description,
        category,
        acquisitionCost: cost
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Assinatura do Termo de Responsabilidade e Custódia
inventoryRouter.post('/assets/:id/custody', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole } = req.body;

    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as any;
    if (!asset) {
      return res.status(404).json({ error: 'Ativo não encontrado.' });
    }

    db.prepare('UPDATE assets SET custodian_signed = 1 WHERE id = ?').run(id);

    logAudit(
      userName || asset.responsible_name,
      userRole || 'Colaborador',
      'UPDATE',
      'Patrimônio',
      `Ativo ${asset.tag_number}`,
      `Termo de Responsabilidade e Custódia assinado digitalmente para ${asset.description}`,
      req.ip || '189.44.120.10'
    );

    return res.json({ success: true, tagNumber: asset.tag_number, signed: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
