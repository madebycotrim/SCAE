import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit2, Ban, Eye, AlertTriangle } from 'lucide-react';
import { api } from '@compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';

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
            <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Infraestrutura Global...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-rose-500/5 border border-rose-500/20 p-12 rounded-3xl flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-900/10">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Falha Crítica de Conexão</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{erro}</p>
                </div>
                <Botao variante="perigo" onClick={() => window.location.reload()}>Tentar Novamente</Botao>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Técnico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 shadow-lg">
                        <Building2 size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Central de Governança</p>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Unidades de Ensino</h2>
                    </div>
                </div>

                <Botao icone={Plus} tamanho="lg" className="relative z-10">
                    Nova Escola
                </Botao>
            </div>

            {/* Barra de Busca / Filtros */}
            <BarraFiltro className="bg-slate-900 border-slate-800 shadow-xl">
                <InputBusca
                    icone={Search}
                    placeholder="Buscar por nome, slug técnico ou identificador..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10 text-white"
                />
            </BarraFiltro>

            {/* Matrix de Dados (Tabela Standard) */}
            <CartaoConteudo className="bg-slate-900 border-slate-800 shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Instituição / Cluster</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Capacidade</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativação</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {escolasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                                            <Search size={48} className="text-slate-600" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Nenhum cluster localizado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                escolasFiltradas.map((escola) => (
                                    <tr key={escola.id} className="hover:bg-indigo-500/5 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{escola.nome}</span>
                                                <span className="text-[10px] font-mono font-bold text-slate-600 group-hover:text-indigo-400 transition-colors">SLUG: {escola.slug}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                                <span className="text-sm font-bold text-slate-400">
                                                    {escola.totalAlunos} Alunos
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <BadgeStatus status={escola.status} />
                                        </td>
                                        <td className="py-5 px-8">
                                            <span className="text-xs font-mono font-bold text-slate-500">
                                                {new Date(escola.criadoEm).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                <Botao variante="ghost" tamanho="sm" icone={Eye} />
                                                <Botao variante="ghost" tamanho="sm" icone={Edit2} className="hover:text-indigo-400" />
                                                <Botao variante="ghost" tamanho="sm" icone={Ban} className="hover:text-rose-400" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>
        </div>
    );
}

function BadgeStatus({ status }: { status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE' }) {
    if (status === 'ATIVA') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-950/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Ativa
            </span>
        );
    }
    if (status === 'SUSPENSA') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-lg shadow-rose-950/20">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Suspensa
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-950/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Pendente
        </span>
    );
}
