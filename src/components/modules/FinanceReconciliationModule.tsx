import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Upload, History, Search, CheckCircle2, AlertTriangle, FileText, RefreshCw, Link, Unlink, PlusCircle, Check, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export const FinanceReconciliationModule: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ofxTransactions, setOfxTransactions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'ofx' | 'movimentos' | 'historico'>('ofx');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Estado para conciliação avulsa
  const [avulsoModalTx, setAvulsoModalTx] = useState<any | null>(null);
  const [avulsoCategory, setAvulsoCategory] = useState('Despesas Bancárias');
  const [avulsoCostCenter, setAvulsoCostCenter] = useState('Controladoria & Finanças');

  const reload = async (id?: string) => {
    try {
      const a = await api.getBankAccounts();
      setAccounts(a);
      const selected = id || accountId || a[0]?.id || '';
      if (selected) {
        setAccountId(selected);
        const [txs, ofxTxs] = await Promise.all([
          api.getBankTransactions(selected),
          api.getOfxTransactions(selected)
        ]);
        setTransactions(txs);
        setOfxTransactions(ofxTxs);
      }
      const recs = await api.getBankReconciliations();
      setHistory(recs);
    } catch (err: any) {
      console.error('Erro ao recarregar conciliação:', err);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (accountId) {
      Promise.all([
        api.getBankTransactions(accountId),
        api.getOfxTransactions(accountId)
      ]).then(([txs, ofxTxs]) => {
        setTransactions(txs);
        setOfxTransactions(ofxTxs);
      });
    }
  }, [accountId]);

  const handleFileUpload = async (file: File) => {
    if (!accountId) {
      alert('Por favor, selecione uma conta bancária antes de importar o arquivo OFX.');
      return;
    }
    setFileName(file.name);
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const text = await file.text();
      const res = await api.importOfx(accountId, text, file.name);
      setUploadMessage(`Importação concluída: ${res.newCount} novas transações adicionadas, ${res.duplicateCount} já existentes.`);
      const [txs, ofxTxs] = await Promise.all([
        api.getBankTransactions(accountId),
        api.getOfxTransactions(accountId)
      ]);
      setTransactions(txs);
      setOfxTransactions(ofxTxs);
    } catch (err: any) {
      setUploadMessage(`Erro na importação: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMatch = async (ofxTxId: string, bankTxId: string) => {
    setActionLoading(ofxTxId);
    try {
      await api.matchOfxTransaction(ofxTxId, bankTxId);
      await reload(accountId);
    } catch (err: any) {
      alert(`Falha ao conciliar: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmatch = async (ofxTxId: string) => {
    setActionLoading(ofxTxId);
    try {
      await api.unmatchOfxTransaction(ofxTxId);
      await reload(accountId);
    } catch (err: any) {
      alert(`Falha ao desconciliar: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAvulsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avulsoModalTx) return;
    setActionLoading(avulsoModalTx.id);
    try {
      await api.reconcileAvulso(avulsoModalTx.id, {
        category: avulsoCategory,
        costCenter: avulsoCostCenter,
        description: avulsoModalTx.memo
      });
      setAvulsoModalTx(null);
      await reload(accountId);
    } catch (err: any) {
      alert(`Falha na conciliação avulsa: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredMovements = useMemo(() => {
    return transactions.filter(t => JSON.stringify(t).toLowerCase().includes(search.toLowerCase()));
  }, [transactions, search]);

  const filteredOfx = useMemo(() => {
    return ofxTransactions.filter(t => JSON.stringify(t).toLowerCase().includes(search.toLowerCase()));
  }, [ofxTransactions, search]);

  const reconciledCount = transactions.filter(t => Boolean(t.reconciled)).length;
  const pendingCount = Math.max(0, transactions.length - reconciledCount);
  const ofxReconciledCount = ofxTransactions.filter(t => t.status === 'CONCILIADO').length;

  return (
    <div className="space-y-5">
      {/* Header & Seleção de Conta */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Conciliação Bancária & OFX</h1>
          <p className="text-xs text-slate-500 mt-1">
            Importação OFX automatizada com deduplicação por FITID, conferência de lançamentos e baixa contábil.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Conta Ativa:</label>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.bank_name || a.bankName} • Ag {a.agency} / Cc {a.account_number || a.accountNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Movimentações do Sistema</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{transactions.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Conciliadas</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{reconciledCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pendentes no Sistema</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Extrato OFX (Conciliados)</span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {ofxReconciledCount} / {ofxTransactions.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          ['ofx', 'Extrato OFX & Conciliação', Upload],
          ['movimentos', 'Movimentações do Sistema', Landmark],
          ['historico', 'Histórico de Fechamento', History]
        ].map(([k, l, Icon]: any) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              tab === k ? 'border-blue-700 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>

      {/* Tab 1: Extrato OFX & Conciliação */}
      {tab === 'ofx' && (
        <div className="space-y-4">
          {/* Card de Importação */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <h3 className="font-black text-sm text-slate-900">Importar Extrato Bancário (OFX / QFX)</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                Deduplicação automática por <strong>FITID</strong> (idempotência bancária estrita). Se você enviar um extrato com transações já importadas, o SEEK não duplicará os registros.
              </p>
              <div className="mt-4 flex justify-center items-center gap-3">
                <label className="inline-flex cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-800 transition">
                  {isUploading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Processando OFX...
                    </span>
                  ) : (
                    'Selecionar arquivo .OFX'
                  )}
                  <input
                    type="file"
                    accept=".ofx,.qfx"
                    disabled={isUploading}
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
                <button
                  onClick={() => reload(accountId)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5 inline mr-1" /> Atualizar
                </button>
              </div>
              {uploadMessage && (
                <div className={`mt-3 text-xs font-bold px-3 py-2 rounded-lg inline-block ${uploadMessage.includes('Erro') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {uploadMessage}
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Transações OFX */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-3 border-b flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar por memo, FITID ou valor..."
                  className="w-full bg-transparent outline-none text-xs"
                />
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredOfx.length} movimentações no extrato
              </span>
            </div>

            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição / FITID</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Valor Extrato</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Ação / Correspondência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfx.map(item => {
                    const isReconciled = item.status === 'CONCILIADO';
                    const hasCandidates = item.candidates && item.candidates.length > 0;
                    const firstCandidate = hasCandidates ? item.candidates[0] : null;

                    return (
                      <tr key={item.id} className={isReconciled ? 'bg-emerald-50/20' : 'hover:bg-slate-50/80'}>
                        <td className="p-3 font-medium whitespace-nowrap text-slate-700">
                          {item.postedDate}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.memo}</div>
                          <div className="text-[10px] text-slate-400 font-mono">FITID: {item.fitid}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${item.type === 'CREDITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black whitespace-nowrap">
                          {Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {isReconciled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Conciliado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {isReconciled ? (
                            <button
                              onClick={() => handleUnmatch(item.id)}
                              disabled={actionLoading === item.id}
                              className="text-slate-400 hover:text-red-700 text-[11px] font-bold inline-flex items-center gap-1 p-1"
                              title="Desconciliar"
                            >
                              <Unlink className="h-3.5 w-3.5" /> Desconciliar
                            </button>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {firstCandidate ? (
                                <button
                                  onClick={() => handleMatch(item.id, firstCandidate.id)}
                                  disabled={actionLoading === item.id}
                                  className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-black shadow-sm inline-flex items-center gap-1"
                                  title={`Vincular à movimentação ${firstCandidate.description}`}
                                >
                                  <Link className="h-3 w-3" /> Conciliar Sugestão
                                </button>
                              ) : null}
                              <button
                                onClick={() => setAvulsoModalTx(item)}
                                disabled={actionLoading === item.id}
                                className="rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-2 py-1 text-[11px] font-bold shadow-sm inline-flex items-center gap-1"
                                title="Criar lançamento de despesa/rendimento bancário avulso e conciliar"
                              >
                                <PlusCircle className="h-3 w-3" /> Avulso
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredOfx.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  Nenhuma transação OFX importada para esta conta bancária.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Movimentações do Sistema */}
      {tab === 'movimentos' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="p-3 border-b flex items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar movimentação do sistema..."
                className="w-full bg-transparent outline-none text-xs"
              />
            </div>
            <button
              onClick={() => reload(accountId)}
              className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição / Origem</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 text-center">Status Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map(t => (
                  <tr key={t.id} className={t.reconciled ? 'bg-emerald-50/20' : 'hover:bg-slate-50/80'}>
                    <td className="p-3 font-medium whitespace-nowrap text-slate-700">
                      {t.transaction_date || t.date || '—'}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{t.description || t.memo}</div>
                      {t.reference_id && (
                        <div className="text-[10px] text-slate-400 font-mono">Ref: {t.reference_id}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{t.category || 'Geral'}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${t.type === 'CREDITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black whitespace-nowrap">
                      {Number(t.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {t.reconciled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Conciliado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMovements.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                Nenhuma movimentação registrada no sistema para esta conta bancária.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Histórico de Conciliações */}
      {tab === 'historico' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b">
              <tr>
                <th className="p-3">Período</th>
                <th className="p-3">Conta Bancária</th>
                <th className="p-3 text-right">Saldo Extrato</th>
                <th className="p-3 text-right">Saldo Sistema</th>
                <th className="p-3 text-right">Diferença</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-bold text-slate-800">{h.period}</td>
                  <td className="p-3">{h.bank_name || h.account_id}</td>
                  <td className="p-3 text-right">
                    {Number(h.statement_balance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-3 text-right">
                    {Number(h.system_balance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-3 text-right font-black">
                    {Number(h.difference || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${h.status === 'CONCILIADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{h.reconciled_by || 'Auditoria'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              Nenhum fechamento de conciliação registrado.
            </div>
          )}
        </div>
      )}

      {/* Modal: Conciliação Avulsa */}
      {avulsoModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="font-black text-base text-slate-900">Conciliar Lançamento Avulso OFX</h3>
            <p className="text-xs text-slate-500">
              Este item não possui título prévio no ERP. O sistema criará o título financeiro, dará baixa imediata e registrará o lançamento contábil em partidas dobradas.
            </p>

            <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
              <div className="font-bold text-slate-900">{avulsoModalTx.memo}</div>
              <div className="flex justify-between text-slate-500">
                <span>Data: {avulsoModalTx.postedDate}</span>
                <span className="font-bold text-slate-800">
                  {Number(avulsoModalTx.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <form onSubmit={handleAvulsoSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria Contábil/Financeira:</label>
                <select
                  value={avulsoCategory}
                  onChange={e => setAvulsoCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="Despesas Bancárias">Despesas Bancárias (Tarifas / Custos)</option>
                  <option value="Juros e Encargos">Juros e Encargos Bancários</option>
                  <option value="Rendimentos Financeiros">Rendimentos Financeiros / Aplicações</option>
                  <option value="Despesas Operacionais">Despesas Operacionais Gerais</option>
                  <option value="Outras Receitas">Outras Receitas Operacionais</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Centro de Custo:</label>
                <select
                  value={avulsoCostCenter}
                  onChange={e => setAvulsoCostCenter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold"
                >
                  <option value="Controladoria & Finanças">Controladoria & Finanças</option>
                  <option value="Administrativo & Recursos Humanos">Administrativo & Recursos Humanos</option>
                  <option value="Comercial & Marketing">Comercial & Marketing</option>
                  <option value="Operações & Infraestrutura">Operações & Infraestrutura</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAvulsoModalTx(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoading)}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-black text-white shadow hover:bg-blue-800 inline-flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Confirmar e Gerar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
