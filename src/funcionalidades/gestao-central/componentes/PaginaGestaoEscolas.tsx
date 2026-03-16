import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit2, Ban, Eye, AlertTriangle } from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@/compartilhado/componentes/UI';

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
                const resposta = await api.obter<EscolaSistema[]>('/central/escolas');
                definirEscolas(resposta);
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
            <div className="flex flex-col items-center justify-center py-32 text-slate-600 gap-6">
                <div className="w-16 h-16 border-4 border-slate-700/30 border-t-slate-400 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-slate-800/60 border border-slate-800 p-12 rounded-2xl flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-slate-800/40 rounded-2xl flex items-center justify-center text-slate-400 shadow-lg">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2 uppercase tracking-tight">Erro de Conexão</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{erro}</p>
                </div>
                <Botao variante="perigo" onClick={() => window.location.reload()}>Recarregar</Botao>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/60 border border-slate-800/80 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700/80 text-slate-400 shadow-lg">
                        <Building2 size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Infraestrutura Educacional</p>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">Unidades de Ensino</h2>
                    </div>
                </div>

                <Botao icone={Plus} tamanho="lg" className="relative z-10 bg-slate-800 hover:bg-slate-700 border border-slate-700/80">
                    Nova Escola
                </Botao>
            </div>

            {/* Busca */}
            <BarraFiltro className="bg-slate-800/60 border-slate-800/80 shadow-xl">
                <InputBusca
                    icone={Search}
                    placeholder="Buscar por nome, slug ou identificador..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-800/50 border-slate-800 focus:border-slate-700 focus:ring-slate-700/20 text-white"
                />
            </BarraFiltro>

            {/* Tabela */}
            <CartaoConteudo className="bg-slate-800/60 border-slate-800/80 shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Instituição</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Capacidade</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">Ativação</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {escolasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                                            <Search size={48} className="text-slate-700" />
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Nenhum resultado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                escolasFiltradas.map((escola) => (
                                    <tr key={escola.id} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{escola.nome}</span>
                                                <span className="text-[10px] font-mono font-bold text-slate-700 group-hover:text-slate-600 transition-colors">{escola.slug}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                                <span className="text-sm font-bold text-slate-400">
                                                    {escola.totalAlunos} Alunos
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <BadgeStatus status={escola.status} />
                                        </td>
                                        <td className="py-5 px-8">
                                            <span className="text-xs font-mono font-bold text-slate-600">
                                                {new Date(escola.criadoEm).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                <Botao variante="ghost" tamanho="sm" icone={Eye} />
                                                <Botao variante="ghost" tamanho="sm" icone={Edit2} className="hover:text-slate-400" />
                                                <Botao variante="ghost" tamanho="sm" icone={Ban} className="hover:text-slate-600" />
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/30 border border-slate-700/80 shadow-lg shadow-slate-950/20">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div> Ativa
            </span>
        );
    }
    if (status === 'SUSPENSA') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-800/50 border border-slate-800 shadow-lg shadow-slate-950/20">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> Suspensa
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/60 border border-slate-800 shadow-lg shadow-slate-950/20">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div> Pendente
        </span>
    );
}
