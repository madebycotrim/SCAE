import { useState } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit2, Ban, Eye } from 'lucide-react';

// Tipagem Mocada Inicial do Tenant (Será consumida do backend D1)
interface EscolaMock {
    id: string;
    nome: string;
    slug: string;
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    criadoEm: string;
    totalAlunos: number;
}

const mockEscolas: EscolaMock[] = [
    { id: '1', nome: 'CEM 03 Taguatinga', slug: 'cem03-taguatinga', status: 'ATIVA', criadoEm: '2024-01-15', totalAlunos: 1450 },
    { id: '2', nome: 'CEF 12 Ceilândia', slug: 'cef12-ceilandia', status: 'ATIVA', criadoEm: '2024-03-22', totalAlunos: 2100 },
    { id: '3', nome: 'CED 45 Gama', slug: 'ced45-gama', status: 'SUSPENSA', criadoEm: '2023-11-05', totalAlunos: 800 },
];

export function PaginaEscolasAGM() {
    const [busca, definirBusca] = useState('');
    const [escolas] = useState<EscolaMock[]>(mockEscolas); // Preparando p/ useQuery no futuro

    const escolasFiltradas = escolas.filter(e => e.nome.toLowerCase().includes(busca.toLowerCase()) || e.slug.includes(busca.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Técnico / Ações */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Infraestrutura Global</p>
                        <h2 className="text-2xl font-bold text-white">Tenants Ativos</h2>
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
