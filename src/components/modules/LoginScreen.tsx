import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, KeyRound, CheckCircle2, UserCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_PROFILES } from '../../data/mockData';
import { Modal } from '../common/Modal';

export const LoginScreen: React.FC = () => {
  const { login, recoverPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await recoverPassword(recoverEmail);
    setRecoverSuccess(true);
    setTimeout(() => {
      setRecoverSuccess(false);
      setRecoverModalOpen(false);
      setRecoverEmail('');
    }, 2000);
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Coluna da Esquerda: Apresentação da Plataforma */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-linear-to-br from-slate-950 via-slate-900 to-blue-950 border-r border-slate-800">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <span className="text-2xl font-black tracking-widest">S</span>
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider text-white">SEEK</span>
              <p className="text-xs text-blue-300 font-medium">Gestão Corporativa Integrada</p>
            </div>
          </div>

          <div className="space-y-4 max-w-lg mt-12">
            <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-bold text-blue-300">
              Plataforma Corporativa V1
            </span>
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              O sistema nervoso integrado da sua organização.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              ERP + CRM + Gestão Administrativa em um único ecossistema corporativo. Multiempresa, Multifilial, alçadas automatizadas e inteligência operacional com o SEEK IA.
            </p>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="border-t border-slate-800/80 pt-6 text-xs text-slate-400 flex items-center justify-between">
          <span>SEEK v1.0.0 — Ambiente de Alta Segurança</span>
          <span className="flex items-center text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4 mr-1 text-emerald-400" />
            RBAC & Trilha Universal de Auditoria
          </span>
        </div>
      </div>

      {/* Coluna da Direita: Formulário de Autenticação & Seleção dos 13 Perfis */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 overflow-y-auto">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* Header Mobile / Title */}
          <div>
            <div className="flex items-center space-x-2.5 lg:hidden mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black">
                S
              </div>
              <span className="text-xl font-black text-white">SEEK</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Acesse o SEEK</h2>
            <p className="mt-1 text-xs text-slate-400">
              Entre com suas credenciais corporativas ou escolha um perfil de demonstração.
            </p>
          </div>

          {/* Form de Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">E-mail ou Matrícula Corporativa</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ex: admin@seek.local"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">Senha</label>
                <button
                  type="button"
                  onClick={() => setRecoverModalOpen(true)}
                  className="text-[11px] font-semibold text-blue-400 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900 px-3 font-bold text-slate-500">
                Ou acesse com 1 clique (13 Perfis RBAC)
              </span>
            </div>
          </div>

          {/* Grid de 13 Perfis Oficiais do SEEK */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              Simulador de Perfis e Permissões Dinâmicas:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {DEMO_PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => login(profile.email)}
                  className="flex items-center space-x-2.5 p-2 rounded-lg border border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500 text-left transition-all group cursor-pointer"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-700 text-xs font-bold text-white group-hover:bg-blue-600">
                    {profile.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-blue-300">
                      {profile.roleTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {profile.fullName.split(' ')[0]} • {profile.department}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha (Pacote 1) */}
      <Modal
        isOpen={recoverModalOpen}
        onClose={() => setRecoverModalOpen(false)}
        title="Recuperação de Acesso Corporativo"
        subtitle="Informe seu e-mail para receber as instruções seguras de redefinição."
      >
        {recoverSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">E-mail de Recuperação Enviado!</h4>
            <p className="text-xs text-slate-500">
              Enviamos um token de uso único para <strong>{recoverEmail}</strong> válido por 30 minutos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRecoverSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">E-mail Cadastrado</label>
              <input
                type="email"
                required
                value={recoverEmail}
                onChange={e => setRecoverEmail(e.target.value)}
                placeholder="seu.email@diskingressos.com.br"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              O link de redefinição será autenticado pelo Core do SEEK em conformidade com as políticas de auditoria.
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecoverModalOpen(false)}
                className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              >
                Voltar ao Login
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800"
              >
                Enviar Instruções
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
