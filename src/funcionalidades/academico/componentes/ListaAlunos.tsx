import { QrCode, Edit2, Trash2, ChevronLeft, ChevronRight, Users, Fingerprint } from 'lucide-react';
import { usarEscola } from '@/escola/ProvedorEscola';
import { Aluno } from '../tipos/academico';
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
    const escola = usarEscola();
    const temQR = escola.metodosAcesso.includes('QRCODE');

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
            <div className="bg-white/40 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800">
                                <th className="py-6 px-8 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={alunosSelecionados.length === alunos.length && alunos.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                (alunos || []).forEach(a => { if (!alunosSelecionados.includes(a.matricula)) aoSelecionar(a.matricula) });
                                            } else {
                                                (alunos || []).forEach(a => { if (alunosSelecionados.includes(a.matricula)) aoSelecionar(a.matricula) });
                                            }
                                        }}
                                        className="w-4 h-4 rounded-lg bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer transition-all"
                                    />
                                </th>
                                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Identificação Principal</th>
                                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Protocolo / ID</th>
                                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Célula Acadêmica</th>
                                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Estado Vital</th>
                                <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 bg-white/40">
                            {carregando ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-6 px-8 text-center"><Esqueleto className="w-4 h-4 mx-auto rounded" /></td>
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-4">
                                                <Esqueleto className="w-12 h-12 rounded-[1.2rem]" />
                                                <div className="space-y-3">
                                                    <Esqueleto className="w-48 h-3" />
                                                    <Esqueleto className="w-24 h-2 opacity-40" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-8"><Esqueleto className="w-20 h-4 rounded" /></td>
                                        <td className="py-6 px-8"><Esqueleto className="w-28 h-4 rounded" /></td>
                                        <td className="py-6 px-8"><Esqueleto className="w-20 h-6 rounded-full" /></td>
                                        <td className="py-6 px-8 text-right"><Esqueleto className="w-32 h-10 ml-auto rounded-xl" /></td>
                                    </tr>
                                ))
                            ) : (alunos || []).map((aluno) => (
                                <tr key={aluno.matricula} className={`group transition-all duration-300 ${alunosSelecionados.includes(aluno.matricula) ? 'bg-indigo-50/50' : 'hover:bg-white hover:shadow-xl hover:scale-[1.002] hover:z-10 relative'}`}>
                                    <td className="py-6 px-8 text-center">
                                        <input
                                            type="checkbox"
                                            checked={alunosSelecionados.includes(aluno.matricula)}
                                            onChange={() => aoSelecionar(aluno.matricula)}
                                            className="w-4 h-4 rounded-lg border-slate-200 text-slate-900 focus:ring-slate-900/20 cursor-pointer transition-all"
                                        />
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-[1.2rem] bg-gradient-to-br ${obterCorAvatar((aluno.matricula || '0'))} flex items-center justify-center text-white font-black text-[10px] shrink-0 border-2 border-white shadow-xl transition-transform group-hover:rotate-6`}>
                                                {(aluno.nome_completo || '').split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n[0] : '').join('').toUpperCase().substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-black text-slate-900 text-sm uppercase tracking-tight transition-colors group-hover:text-indigo-600 truncate max-w-[250px]">{aluno.nome_completo}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estudante Regular</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="inline-flex items-center gap-2 group-hover:scale-105 transition-transform">
                                            <div className="p-1 px-1.5 bg-slate-900 text-white rounded-md">
                                                <Fingerprint size={10} />
                                            </div>
                                            <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-tighter">
                                                {aluno.matricula}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.1em]">{aluno.turma_id || 'NÃO ENTURMADO'}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        {aluno.ativo !== false ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 border border-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                Ativo
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 bg-rose-50 border border-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                                Suspenso
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-6 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                             {escola.metodosAcesso.length > 0 && (
                                                <button
                                                    onClick={() => aoVerQRCode(aluno.matricula)}
                                                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 text-slate-500 hover:text-white hover:bg-slate-900 hover:border-slate-900 rounded-xl transition-all shadow-sm active:scale-90"
                                                    title={escola.metodosAcesso.includes('DIGITAL') ? "Gerenciar Biometria" : "Visualizar Credencial"}
                                                >
                                                    {escola.metodosAcesso.includes('DIGITAL') ? <Fingerprint size={16} /> : <QrCode size={16} />}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => aoEditar(aluno)}
                                                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 text-slate-500 hover:text-white hover:bg-slate-900 hover:border-slate-900 rounded-xl transition-all shadow-sm active:scale-90"
                                                title="Configurar Registro"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => aoExcluir(aluno)}
                                                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 text-slate-500 hover:text-white hover:bg-rose-600 hover:border-rose-600 rounded-xl transition-all shadow-sm active:scale-90"
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
            </div>

            {
                totalPaginas > 1 && (
                    <div className="bg-slate-900 rounded-[2rem] p-4 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl mt-10">
                        <div className="flex items-center gap-6 px-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Indexação Atual</span>
                                <span className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Página {paginaAtual} de {totalPaginas}</span>
                            </div>
                            <div className="w-px h-8 bg-slate-800" />
                            <div className="flex items-center gap-3">
                                <Users size={16} className="text-indigo-400" />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{alunos.length} Registros na Visualização</span>
                            </div>
                        </div>
                        <div className="flex gap-2 p-2 bg-white/5 rounded-2xl">
                            <button
                                onClick={() => aoMudarPagina(paginaAtual - 1)}
                                disabled={paginaAtual === 1}
                                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white hover:text-slate-900 disabled:opacity-20 transition-all active:scale-90"
                            >
                                <ChevronLeft size={18} strokeWidth={3} />
                            </button>

                            <div className="flex gap-2 items-center">
                                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPaginas > 5 && paginaAtual > 3) {
                                        pageNum = Math.min(paginaAtual - 2 + i, totalPaginas - 4 + i);
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => aoMudarPagina(pageNum)}
                                            className={`w-11 h-11 rounded-xl text-[11px] font-black tracking-widest transition-all ${paginaAtual === pageNum
                                                ? 'bg-white text-slate-900 shadow-2xl scale-[1.1] z-10'
                                                : 'text-slate-400 hover:text-white hover:bg-white/10'
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
                                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white hover:text-slate-900 disabled:opacity-20 transition-all active:scale-90"
                            >
                                <ChevronRight size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


