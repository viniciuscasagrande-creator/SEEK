import { db } from '../db.js';

export class AccountingService {
  private nextCode(): string {
    const row = db.prepare('SELECT COUNT(*) as count FROM accounting_entries').get() as { count: number };
    return `LAN-${new Date().getFullYear()}-${String(row.count + 1).padStart(4, '0')}`;
  }

  postFinancialRecognition(input: { recordId:string; recordCode:string; type:string; amount:number; date:string; costCenter?:string; createdBy:string }) {
    const existing = db.prepare("SELECT * FROM accounting_entries WHERE origin_type='RECONHECIMENTO_FINANCEIRO' AND origin_id=?").get(input.recordId) as any;
    if (existing) return existing;
    const debit = input.type === 'PAGAR' ? '4.02.01.002' : '1.01.02.001';
    const credit = input.type === 'PAGAR' ? '2.01.01.001' : '3.01.01.001';
    const id=`entry-recog-${input.recordId}`, code=this.nextCode(), period=input.date.substring(0,7);
    db.prepare(`INSERT INTO accounting_entries (id,code,date,period,description,debit_account_code,credit_account_code,amount,cost_center,origin_type,origin_id,created_by) VALUES(?,?,?,?,?,?,?,?,?,'RECONHECIMENTO_FINANCEIRO',?,?)`)
      .run(id,code,input.date,period,`Reconhecimento ${input.recordCode}`,debit,credit,input.amount,input.costCenter||'Administrativo & Operações',input.recordId,input.createdBy);
    this.applyBalance(debit,input.amount,'DEBITO'); this.applyBalance(credit,input.amount,'CREDITO');
    return db.prepare('SELECT * FROM accounting_entries WHERE id=?').get(id);
  }

  postFinancialSettlement(input: {
    recordId: string; recordCode: string; type: string; amount: number; date: string;
    costCenter?: string; bankAccountCode?: string; createdBy: string;
  }) {
    const existing = db.prepare("SELECT * FROM accounting_entries WHERE origin_type = 'LIQUIDACAO_FINANCEIRA' AND origin_id = ?").get(input.recordId) as any;
    if (existing) return existing;

    const bankCode = input.bankAccountCode || '1.01.01.001';
    const debit = input.type === 'PAGAR' ? '2.01.01.001' : bankCode;
    const credit = input.type === 'PAGAR' ? bankCode : '1.01.02.001';
    const id = `entry-settle-${input.recordId}`;
    const code = this.nextCode();
    const period = input.date.substring(0, 7);

    db.prepare(`INSERT INTO accounting_entries
      (id, code, date, period, description, debit_account_code, credit_account_code, amount, cost_center, origin_type, origin_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'LIQUIDACAO_FINANCEIRA', ?, ?)`)
      .run(id, code, input.date, period, `Liquidação ${input.recordCode}`, debit, credit, input.amount,
        input.costCenter || 'Administrativo & Operações', input.recordId, input.createdBy);

    this.applyBalance(debit, input.amount, 'DEBITO');
    this.applyBalance(credit, input.amount, 'CREDITO');
    return db.prepare('SELECT * FROM accounting_entries WHERE id = ?').get(id);
  }

  private applyBalance(code: string, amount: number, side: 'DEBITO'|'CREDITO') {
    const acc = db.prepare('SELECT nature FROM chart_of_accounts WHERE code = ?').get(code) as { nature: string } | undefined;
    if (!acc) throw new Error(`Conta contábil ${code} não encontrada.`);
    const increases = (side === 'DEBITO' && acc.nature === 'DEVEDORA') || (side === 'CREDITO' && acc.nature === 'CREDORA');
    db.prepare('UPDATE chart_of_accounts SET balance = balance + ? WHERE code = ?').run(increases ? amount : -amount, code);
  }
}
export const accountingService = new AccountingService();
