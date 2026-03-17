import { QrCode, Edit2, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Aluno } from '../tipos/academico';
import { mascararDadoPessoal } from '@/compartilhado/utils/registrarLocal';
import { CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';

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
    carregando?: boolean;
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
    obterCorAvatar,
    carregando
}: ListaAlunosProps) {
    if (alunos.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-24 text-center animate-fade-in shadow-suave flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
                    <Users size={32} className="text-slate-200" />
                </div>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-2">Dados não identificados</h3>
                <p className="text-[9px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest leading-relaxed">Nenhum registro de discente corresponde aos critérios de filtragem definidos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CartaoConteudo className="mt-8">
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
                                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer transition-all"
                                    />
                                </th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrícula</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregando ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="animate-fade-in">
                                        <td className="py-5 px-8 text-center"><Esqueleto className="w-4 h-4 mx-auto" /></td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-3">
                                                <Esqueleto className="w-9 h-9 rounded-2xl" />
                                                <div className="space-y-2">
                                                    <Esqueleto className="w-32 h-3" />
                                                    <Esqueleto className="w-24 h-2 opacity-60" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8"><Esqueleto className="w-16 h-4" /></td>
                                        <td className="py-5 px-8"><Esqueleto className="w-20 h-4" /></td>
                                        <td className="py-5 px-8"><Esqueleto className="w-16 h-5 rounded-2xl" /></td>
                                        <td className="py-5 px-8 text-right"><Esqueleto className="w-24 h-8 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : alunos.map((aluno) => (
                                <tr key={aluno.matricula} className={`hover:bg-indigo-50/20 transition-all group ${alunosSelecionados.includes(aluno.matricula) ? 'bg-indigo-50/40' : ''}`}>
                                    <td className="py-4 px-8 text-center">
                                        <input
                                            type="checkbox"
                                            checked={alunosSelecionados.includes(aluno.matricula)}
                                            onChange={() => aoSelecionar(aluno.matricula)}
                                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer transition-all"
                                        />
                                    </td>
                                    <td className="py-4 px-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-[9px] shrink-0 border border-slate-200 transition-all">
                                                {aluno.nome_completo.split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n[0] : '').join('').toUpperCase().substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-black text-slate-800 text-xs uppercase tracking-tight group-hover:text-slate-950 transition-colors">{aluno.nome_completo}</span>
                                             </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-8">
                                        <span className="text-[9px] font-mono font-black text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-2xl">
                                            {aluno.matricula}
                                        </span>
                                    </td>
                                    <td className="py-4 px-8">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{aluno.turma_id || 'NÃO ENTURMADO'}</span>
                                    </td>
                                    <td className="py-4 px-8">
                                        {aluno.ativo !== false ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 border border-slate-200">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500 pulse-subtle"></div> Ativo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100">
                                                <div className="w-1 h-1 rounded-full bg-rose-500"></div> Suspenso
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-8 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => aoVerQRCode(aluno.matricula)}
                                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"
                                                title="Visualizar Credencial"
                                            >
                                                <QrCode size={16} />
                                            </button>
                                            <button
                                                onClick={() => aoEditar(aluno)}
                                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"
                                                title="Configurar Registro"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => aoExcluir(aluno)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                                title="Remover do Sistema"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>

            {
                totalPaginas > 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-suave mt-8">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Página</span>
                                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">{paginaAtual} de {totalPaginas}</span>
                            </div>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => aoMudarPagina(paginaAtual - 1)}
                                disabled={paginaAtual === 1}
                                className="w-9 h-9 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex gap-1 items-center">
                                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPaginas > 5 && paginaAtual > 3) {
                                        pageNum = Math.min(paginaAtual - 2 + i, totalPaginas - 4 + i);
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => aoMudarPagina(pageNum)}
                                            className={`w-9 h-9 rounded-2xl text-[9px] font-black tracking-widest transition-all border ${paginaAtual === pageNum
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-suave'
                                                : 'text-slate-400 border-transparent hover:text-slate-900 hover:bg-slate-50'
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
                                className="w-9 h-9 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-20 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


