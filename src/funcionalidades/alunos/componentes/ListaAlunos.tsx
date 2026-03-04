import { QrCode, Edit2, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Aluno } from '../types/aluno';
import { mascararDadoPessoal } from '@compartilhado/utils/registrarLocal';

interface ListaAlunosProps {
    alunos: Aluno[];
    alunosSelecionados: string[];
    paginaAtual: number;
    totalPaginas: number;
    aoSelecionar: (matricula: string) => void;
    aoVerQRCode: (matricula: string) => void;
    aoEditar: (aluno: Aluno) => void;
    aoExcluir: (aluno: Aluno) => void;
    aoMudarPagina: (pagina: number) => void;
    obterCorAvatar: (id: string) => string;
}

export default function ListaAlunos({
    alunos,
    alunosSelecionados,
    paginaAtual,
    totalPaginas,
    aoSelecionar,
    aoVerQRCode,
    aoEditar,
    aoExcluir,
    aoMudarPagina,
    obterCorAvatar
}: ListaAlunosProps) {
    if (alunos.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] border border-slate-200/60 p-24 text-center animate-fade-in shadow-xl shadow-slate-900/5">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-slate-100 shadow-inner">
                    <Users size={40} className="text-slate-300" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-2">Cluster de dados vazio</h3>
                <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest">Nenhum registro de discente identificado para os filtros aplicados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-2xl overflow-hidden mt-8">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="py-5 px-8 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={alunosSelecionados.length === alunos.length && alunos.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                alunos.forEach(a => { if (!alunosSelecionados.includes(a.matricula)) aoSelecionar(a.matricula) });
                                            } else {
                                                alunos.forEach(a => { if (alunosSelecionados.includes(a.matricula)) aoSelecionar(a.matricula) });
                                            }
                                        }}
                                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-600/20 cursor-pointer transition-all shadow-sm"
                                    />
                                </th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificação do Discente</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registro Acadêmico (RA)</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidade / Classe</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Operacional</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações de Gestão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {alunos.map((aluno) => (
                                <tr key={aluno.matricula} className={`hover:bg-indigo-50/20 transition-all group ${alunosSelecionados.includes(aluno.matricula) ? 'bg-indigo-50/40' : ''}`}>
                                    <td className="py-5 px-8 text-center">
                                        <input
                                            type="checkbox"
                                            checked={alunosSelecionados.includes(aluno.matricula)}
                                            onChange={() => aoSelecionar(aluno.matricula)}
                                            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-600/20 cursor-pointer transition-all shadow-sm"
                                        />
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px] shrink-0 border border-slate-200 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                                                {aluno.nome_completo.split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n[0] : '').join('').toUpperCase().substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-indigo-700 transition-colors">{aluno.nome_completo}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aluno.email ? mascararDadoPessoal(aluno.email, 'email') : 'CONTATO NÃO CATALOGADO'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-[10px] font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg shadow-inner">
                                            {aluno.matricula}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{aluno.turma_id || 'NÃO ENTURMADO'}</span>
                                    </td>
                                    <td className="py-5 px-8">
                                        {aluno.ativo !== false ? (
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border-2 border-emerald-100 shadow-sm transition-all hover:scale-110">
                                                <div className="w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Operacional
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border-2 border-rose-100 shadow-sm transition-all hover:scale-110">
                                                <div className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div> Registro Suspenso
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => aoVerQRCode(aluno.matricula)}
                                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all hover:shadow-lg border border-transparent hover:border-slate-100 active:scale-90"
                                                title="Visualizar Credencial"
                                            >
                                                <QrCode size={18} />
                                            </button>
                                            <button
                                                onClick={() => aoEditar(aluno)}
                                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all hover:shadow-lg border border-transparent hover:border-slate-100 active:scale-90"
                                                title="Configurar Registro"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => aoExcluir(aluno)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-2xl transition-all hover:shadow-lg border border-transparent hover:border-slate-100 active:scale-90"
                                                title="Remover do Sistema"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPaginas > 1 && (
                <div className="bg-white rounded-[2rem] border border-slate-200/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-900/5 mt-8">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl shadow-inner">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cluster de Visualização</span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">{paginaAtual} / {totalPaginas}</span>
                        </div>
                    </div>
                    <div className="flex gap-2.5">
                        <button
                            onClick={() => aoMudarPagina(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                            className="w-11 h-11 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex gap-1.5 items-center">
                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPaginas > 5 && paginaAtual > 3) {
                                    pageNum = Math.min(paginaAtual - 2 + i, totalPaginas - 4 + i);
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => aoMudarPagina(pageNum)}
                                        className={`w-11 h-11 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-90 ${paginaAtual === pageNum
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => aoMudarPagina(paginaAtual + 1)}
                            disabled={paginaAtual === totalPaginas}
                            className="w-11 h-11 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

