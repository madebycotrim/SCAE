import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit2, Ban, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@compartilhado/servicos/api';

// Interface ajustada para refletir o retorno do D1
interface EscolaSistema {
    id: string;
    nome: string;
    slug: string;
    totalAlunos: number;
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    criadoEm: string;
}

export function PaginaGestaoEscolas() {
    const [busca, definirBusca] = useState('');
    const [escolas, definirEscolas] = useState<EscolaSistema[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<string | null>(null);

    useEffect(() => {
        const buscarEscolas = async () => {
            try {
                definirCarregando(true);
                // No Módulo Central, não enviamos X-Escola-ID para listagem global
                const resposta = await api.obter<{ dados: EscolaSistema[] }>('/central/escolas');
                definirEscolas(resposta.dados);
            } catch (err: any) {
                console.error('Erro ao buscar escolas:', err);
                definirErro(err.response?.data?.erro || 'Falha ao carregar unidades de ensino.');
            } finally {
                definirCarregando(false);
            }
        };

        buscarEscolas();
    }, []);

    const escolasFiltradas = escolas.filter(e =>
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        e.slug.toLowerCase().includes(busca.toLowerCase())
    );

    if (carregando) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="font-medium animate-pulse">Sincronizando com a infraestrutura global...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-xl flex flex-col items-center text-center gap-4">
                <AlertTriangle className="w-12 h-12 text-rose-500" />
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Erro de Conexão</h3>
                    <p className="text-slate-400">{erro}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Técnico / Ações */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                {/* ... conteúdo idêntico ao anterior ... */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Infraestrutura Global</p>
                        <h2 className="text-2xl font-bold text-white">Escolas Ativas</h2>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
                    <Plus size={16} />
                    Nova Unidade
                </button>
            </div>

            {/* Hub de Filtros */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou slug técnico..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500 transition-shadow"
                    />
                </div>
            </div>

            {/* Matrix de Dados (Tabela) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Identificação</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Carga Operacional</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ativação</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                            {escolasFiltradas.map((escola) => (
                                <tr key={escola.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-white">{escola.nome}</span>
                                            <span className="text-xs text-slate-500 font-mono">
                                                Slug: {escola.slug}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            <span className="text-sm text-slate-300">
                                                {escola.totalAlunos} alunos
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${escola.status === 'ATIVA'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : escola.status === 'SUSPENSA'
                                                ? 'bg-rose-500/10 text-rose-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {escola.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-slate-300">
                                            {new Date(escola.criadoEm).toLocaleDateString('pt-BR')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="inline-flex items-center justify-end gap-2">
                                            <button className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Ver Detalhes">
                                                <Eye size={16} />
                                            </button>
                                            <button className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors" title="Editar Instância">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Suspender Instância">
                                                <Ban size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {escolasFiltradas.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-600">
                                                <Search size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-400">Nenhuma instância encontrada na busca.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

