import { useState, useEffect } from 'react';
import { Building2, Search, Edit2, Ban, Eye, AlertTriangle, Plus } from 'lucide-react';
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
                definirErro(err.message || 'Falha ao carregar unidades de ensino.');
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
            <div className="flex flex-col items-center justify-center py-48 text-slate-400 gap-8 animate-fade-in">
                <div className="relative">
                    <div className="w-16 h-16 border-[3px] border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-slate-50 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse italic">Indexando Unidades...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-white border border-slate-200 p-16 rounded-[40px] flex flex-col items-center text-center gap-8 max-w-xl mx-auto shadow-2xl shadow-slate-200/50">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                    <AlertTriangle size={36} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tighter italic">Falha de Sincronia</h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-wide">{erro}</p>
                </div>
                <Botao variante="primario" className="px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all" onClick={() => window.location.reload()}>Tentar Reconexão</Botao>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white border border-slate-200 p-10 rounded-[32px] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 blur-[100px] rounded-full pointer-events-none group-hover:bg-slate-100 transition-colors duration-700"></div>

                <div className="flex items-center gap-8 relative z-10">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-slate-200 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <Building2 size={36} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Ecossistema Educacional</p>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Unidades de Ensino</h2>
                    </div>
                </div>

                <Botao icone={Plus} tamanho="lg" className="relative z-10 bg-slate-900 text-white hover:bg-black border-none rounded-2xl px-8 h-14 shadow-xl shadow-slate-200 font-black uppercase tracking-widest text-xs active:scale-95 transition-all">
                    Nova Instituição
                </Botao>
            </header>

            {/* Busca */}
            <BarraFiltro className="bg-white border-slate-200 shadow-sm p-3 rounded-2xl flex items-center">
                <InputBusca
                    icone={Search}
                    placeholder="Pesquisar por nome, slug ou identificador da unidade..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-50 border-transparent focus:bg-white focus:border-slate-900 focus:ring-0 text-slate-900 placeholder:text-slate-300 font-bold text-sm h-14 rounded-xl px-4 transition-all"
                />
            </BarraFiltro>

            {/* Grid/Tabela Layout */}
            <CartaoConteudo className="bg-white border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instituição / ID</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Capacidade Única</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status Operacional</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data de Ativação</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {escolasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 grayscale opacity-20">
                                            <Search size={64} strokeWidth={1} className="text-slate-900" />
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Vácuo de Informação</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                escolasFiltradas.map((escola) => (
                                    <tr key={escola.id} className="hover:bg-slate-50/50 transition-all duration-300 group cursor-default">
                                        <td className="py-8 px-10">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-slate-900 group-hover:tracking-wide transition-all uppercase italic">{escola.nome}</span>
                                                <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-slate-500 transition-colors uppercase tracking-widest">{escola.slug}</span>
                                            </div>
                                        </td>
                                        <td className="py-8 px-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">
                                                    {escola.totalAlunos} <span className="text-[10px] font-bold text-slate-300 italic">Discentes</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-8 px-10 text-center">
                                            <BadgeStatus status={escola.status} />
                                        </td>
                                        <td className="py-8 px-10">
                                            <span className="text-[11px] font-mono font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {new Date(escola.criadoEm).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-8 px-10 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Botao variante="ghost" tamanho="sm" icone={Eye} className="hover:bg-slate-900 hover:text-white rounded-xl transition-all h-10 w-10 flex items-center justify-center p-0" />
                                                <Botao variante="ghost" tamanho="sm" icone={Edit2} className="hover:bg-slate-900 hover:text-white rounded-xl transition-all h-10 w-10 flex items-center justify-center p-0" />
                                                <Botao variante="ghost" tamanho="sm" icone={Ban} className="hover:bg-red-500 hover:text-white rounded-xl transition-all h-10 w-10 flex items-center justify-center p-0" />
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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 bg-slate-50 border border-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div> Ativa
            </span>
        );
    }
    if (status === 'SUSPENSA') {
        return (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white border border-slate-100 italic">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Suspensa
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-50 border border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-bounce"></div> Pendente
        </span>
    );
}
