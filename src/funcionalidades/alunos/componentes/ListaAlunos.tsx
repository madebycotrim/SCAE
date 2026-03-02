import { QrCode, Edit2, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Aluno } from '../types/aluno';

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
    getAvatarColor: (id: string) => string;
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
    getAvatarColor
}: ListaAlunosProps) {
    if (alunos.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center animate-fade-in">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-100">
                    <Users size={32} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum aluno encontrado</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">Tente ajustar seus filtros ou adicione um novo aluno ao sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-3 px-6 w-12 text-center">
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
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Aluno</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Matrícula / ID</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidade/Turma</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Ações Rápidas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {alunos.map((aluno) => (
                                <tr key={aluno.matricula} className={`hover:bg-gray-50 transition-colors ${alunosSelecionados.includes(aluno.matricula) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="py-3 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={alunosSelecionados.includes(aluno.matricula)}
                                            onChange={() => aoSelecionar(aluno.matricula)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer transition-colors"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xs shrink-0 border border-gray-200">
                                                {aluno.nome_completo.split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n[0] : '').join('').toUpperCase().substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900 text-sm">{aluno.nome_completo}</span>
                                                <span className="text-xs text-gray-500">{aluno.email || 'Sem e-mail'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-sm font-medium text-gray-900 bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                                            {aluno.matricula}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-sm font-medium text-gray-900">{aluno.turma_id || 'Não Definida'}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {aluno.ativo !== false ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-green-700 bg-green-50 border border-green-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Ativo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-red-700 bg-red-50 border border-red-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div> Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => aoVerQRCode(aluno.matricula)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Credencial"
                                            >
                                                <QrCode size={16} />
                                            </button>
                                            <button
                                                onClick={() => aoEditar(aluno)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => aoExcluir(aluno)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                                                title="Excluir"
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

            {totalPaginas > 1 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm mt-6">
                    <span className="text-sm text-gray-500">
                        Mostrando página <span className="font-semibold text-gray-900">{paginaAtual}</span> de <span className="font-semibold text-gray-900">{totalPaginas}</span>
                    </span>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => aoMudarPagina(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPaginas > 5 && paginaAtual > 3) {
                                    pageNum = Math.min(paginaAtual - 2 + i, totalPaginas - 4 + i);
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => aoMudarPagina(pageNum)}
                                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${paginaAtual === pageNum
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50'
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
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
