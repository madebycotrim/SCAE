/**
 * TelaAutocadastro — Responsável acessa link público da escola e se vincula ao aluno.
 * Rota: /:slugEscola/responsavel/cadastro (pública, sem login Google).
 */
import { useState } from 'react';
import { usarAutocadastro } from '../hooks/usarAutocadastro';
import { usarTenant } from '@tenant/provedorTenant';
import { STATUS_VINCULO } from '../types/responsavel.tipos';
import { ShieldCheck, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function TelaAutocadastro() {
    const { nomeEscola, logoUrl } = usarTenant();
    const { vincular, status, erro } = usarAutocadastro();

    const [codigoAluno, definirCodigoAluno] = useState('');
    const [nomeResponsavel, definirNomeResponsavel] = useState('');
    const [telefone, definirTelefone] = useState('');

    const aoSubmeter = async (e) => {
        e.preventDefault();
        await vincular(codigoAluno.trim(), nomeResponsavel.trim(), telefone.trim());
    };

    if (status === STATUS_VINCULO.VINCULADO) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} className="text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Vinculação Efetuada</h2>
                    <p className="text-slate-500 mb-6 font-medium">Conta de responsável configurada com sucesso.</p>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Você passará a receber notificações de frequência e saídas do(a) aluno(a) na unidade{' '}
                            <strong className="text-slate-800">{nomeEscola}</strong>.
                        </p>
                    </div>

                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest animate-pulse">
                        Aguardando autorização da secretaria...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md w-full p-8">
                {/* Header Clean */}
                <div className="text-center mb-8">
                    {logoUrl ? (
                        <div className="mb-4 inline-block">
                            <img src={logoUrl} alt={nomeEscola} className="h-10 object-contain" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserPlus className="text-indigo-600 w-6 h-6" />
                        </div>
                    )}

                    <h3 className="text-2xl font-bold text-slate-900 mb-2 mt-2">Acesso Responsável</h3>
                    <p className="text-sm font-medium text-slate-500">
                        Informe os dados para realizar o vínculo com o aluno.
                    </p>
                </div>

                {/* Formulário SaaS */}
                <form onSubmit={aoSubmeter} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Código de Identificação
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={codigoAluno}
                                onChange={(e) => definirCodigoAluno(e.target.value)}
                                placeholder="ALU-202X-000"
                                required
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 uppercase"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <ShieldCheck size={18} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Nome do Responsável
                        </label>
                        <input
                            type="text"
                            value={nomeResponsavel}
                            onChange={(e) => definirNomeResponsavel(e.target.value)}
                            placeholder="Nome completo..."
                            required
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            WhatsApp para Alertas (Opcional)
                        </label>
                        <input
                            type="tel"
                            value={telefone}
                            onChange={(e) => definirTelefone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {erro && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm font-medium">
                            <AlertCircle size={16} className="shrink-0" />
                            {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === STATUS_VINCULO.PROCESSANDO}
                        className="w-full py-2.5 mt-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {status === STATUS_VINCULO.PROCESSANDO ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Validando...
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={18} />
                                Confirmar Vínculo
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                    <p className="text-xs font-medium text-slate-500">
                        SCAE &copy; 2026 - Controle Escolar Inteligente
                    </p>
                </div>
            </div>
        </div>
    );
}

