/**
 * TelaAutocadastro â€” ResponsÃ¡vel acessa link pÃºblico da escola e se vincula ao aluno.
 * Rota: /:slugEscola/responsavel/cadastro (pÃºblica, sem login Google).
 */
import { useState } from 'react';
import { useAutocadastro } from '../hooks/useAutocadastro';
import { usarTenant } from '@tenant/provedorTenant';
import { STATUS_VINCULO } from '../types/responsavel.tipos';
import { ShieldCheck, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function TelaAutocadastro() {
    const { nomeEscola, logoUrl } = usarTenant();
    const { vincular, status, erro } = useAutocadastro();

    const [codigoAluno, definirCodigoAluno] = useState('');
    const [nomeResponsavel, definirNomeResponsavel] = useState('');
    const [telefone, definirTelefone] = useState('');

    const aoSubmeter = async (e) => {
        e.preventDefault();
        await vincular(codigoAluno.trim(), nomeResponsavel.trim(), telefone.trim());
    };

    if (status === STATUS_VINCULO.VINCULADO) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-emerald-100">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100/50">
                        <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">VinculaÃ§Ã£o Realizada!</h2>
                    <p className="text-slate-500 leading-relaxed">
                        VocÃª receberÃ¡ notificaÃ§Ãµes sobre a entrada e saÃ­da do(a) aluno(a) na escola <strong>{nomeEscola}</strong>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 border border-slate-100">
                {/* Header */}
                <div className="text-center mb-8">
                    {logoUrl && (
                        <img src={logoUrl} alt={nomeEscola} className="h-12 mx-auto mb-4 object-contain" />
                    )}
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                        <UserPlus className="text-indigo-600 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Cadastro de ResponsÃ¡vel</h2>
                    <p className="text-slate-500 text-sm">
                        Informe o cÃ³digo fornecido pela escola para vincular seu acesso.
                    </p>
                </div>

                {/* FormulÃ¡rio */}
                <form onSubmit={aoSubmeter} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">CÃ³digo do Aluno</label>
                        <input
                            type="text"
                            value={codigoAluno}
                            onChange={(e) => definirCodigoAluno(e.target.value)}
                            placeholder="Ex: ALU-2024-001"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Seu Nome Completo</label>
                        <input
                            type="text"
                            value={nomeResponsavel}
                            onChange={(e) => definirNomeResponsavel(e.target.value)}
                            placeholder="Nome do responsÃ¡vel"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">WhatsApp</label>
                        <input
                            type="tel"
                            value={telefone}
                            onChange={(e) => definirTelefone(e.target.value)}
                            placeholder="(61) 99999-9999"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all"
                        />
                    </div>

                    {erro && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium">
                            <AlertCircle size={16} />
                            {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === STATUS_VINCULO.PROCESSANDO}
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === STATUS_VINCULO.PROCESSANDO ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Vinculando...
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={18} />
                                Vincular ResponsÃ¡vel
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400">
                    O cÃ³digo do aluno Ã© fornecido pela secretaria da escola.
                </p>
            </div>
        </div>
    );
}
