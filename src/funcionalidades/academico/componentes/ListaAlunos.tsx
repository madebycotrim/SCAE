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
    aoSelecionarTodos: (matriculas: string[]) => void;

    obterCorAvatar: (id: string) => string;
    carregando?: boolean;
}
/**
 * Lista de visualização de alunos com paginação e ações em lote.
 */
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
    aoSelecionarTodos,

    obterCorAvatar,
    carregando
}: ListaAlunosProps) {
    const escola = usarEscola();
    const temQR = escola.metodosAcesso.includes('QRCODE');

    if (alunos.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-20 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mb-5 border border-slate-100">
                    <Users size={32} className="text-slate-200" />
                </div>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-2">Dados não identificados</h3>
                <p className="text-[9px] font-bold text-slate-400 max-w-xs mx-auto uppercase tracking-widest leading-relaxed">Nenhum registro de discente corresponde aos critérios de filtragem definidos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="py-5 px-8 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={alunosSelecionados.length === alunos.length && alunos.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) aoSelecionarTodos(alunos.map(a => a.matricula));
                                            else aoSelecionarTodos([]);
                                        }}
                                        className="w-4 h-4 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer transition-all"
                                    />
                                </th>
                                <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificação</th>
                                <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Protocolo / ID</th>
                                <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Turma</th>
                                <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="py-4 px-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregando ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-6 px-8 text-center"><Esqueleto className="w-4 h-4 mx-auto rounded" /></td>
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-4">
                                                <Esqueleto className="w-12 h-12 rounded-2xl" />
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
                                <tr key={aluno.matricula} className={`group transition-all duration-150 ${alunosSelecionados.includes(aluno.matricula) ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                                    <td className="py-6 px-8 text-center">
                                        <input
                                            type="checkbox"
                                            checked={alunosSelecionados.includes(aluno.matricula)}
                                            onChange={() => aoSelecionar(aluno.matricula)}
                                            className="w-4 h-4 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-600/20 cursor-pointer transition-all"
                                        />
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] shrink-0 border border-slate-200/50`}>
                                                {(aluno.nome_completo || '').split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n[0] : '').join('').toUpperCase().substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-900 text-sm uppercase tracking-tight truncate max-w-[250px]">{aluno.nome_completo}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estudante Regular</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="inline-flex items-center gap-2.5">
                                            <div className={`p-1 px-1.5 rounded-md border ${temQR ? 'bg-blue-50 text-blue-500 border-blue-100/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100/50'}`}>
                                                {temQR ? <QrCode size={12} /> : <Fingerprint size={12} />}
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-tight">
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
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 border border-emerald-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Ativo
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-slate-50 border border-slate-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                Suspenso
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-6 px-8 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => aoEditar(aluno)}
                                                    className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all shadow-sm"
                                                    title="Configurar Registro"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => aoExcluir(aluno)}
                                                    className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 rounded-lg transition-all shadow-sm"
                                                    title="Remover do Sistema"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <button 
                                                    className="w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-lg active:scale-90"
                                                    onClick={() => aoVerQRCode(aluno.matricula)}
                                                    title={temQR ? 'Ver QR Code / Credencial' : 'Gerenciar Biometria'}
                                                >
                                                    {temQR ? <QrCode size={14} /> : <Fingerprint size={14} />}
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
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-suave mt-10">
                        <div className="flex items-center gap-6 px-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Indexação</span>
                                <span className="text-xs font-bold text-slate-900 uppercase leading-none">Página {paginaAtual} de {totalPaginas}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-100" />
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{alunos.length} registros</span>
                            </div>
                        </div>
                        <div className="flex gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-100">
                            <button
                                onClick={() => aoMudarPagina(paginaAtual - 1)}
                                disabled={paginaAtual === 1}
                                className="w-9 h-9 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm disabled:opacity-20 transition-all font-bold"
                            >
                                <ChevronLeft size={16} strokeWidth={2} />
                            </button>

                            <div className="flex gap-1 items-center">
                                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                    let numeroPagina = i + 1;
                                    if (totalPaginas > 5 && paginaAtual > 3) {
                                        numeroPagina = Math.min(paginaAtual - 2 + i, totalPaginas - 4 + i);
                                    }
                                    return (
                                        <button
                                            key={numeroPagina}
                                            onClick={() => aoMudarPagina(numeroPagina)}
                                            className={`w-9 h-9 rounded-md text-[10px] font-bold tracking-widest transition-all ${paginaAtual === numeroPagina
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                                                }`}
                                        >
                                            {numeroPagina}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => aoMudarPagina(paginaAtual + 1)}
                                disabled={paginaAtual === totalPaginas}
                                className="w-9 h-9 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-sm disabled:opacity-20 transition-all font-bold"
                            >
                                <ChevronRight size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
}


