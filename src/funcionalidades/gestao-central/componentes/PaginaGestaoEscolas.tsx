import { useState, useEffect } from 'react';
import { 
    Building2, Search, Edit2, Ban, Eye, AlertTriangle, Plus, 
    ExternalLink, Activity, Server, ShieldAlert, X, Loader2, Zap 
} from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@/compartilhado/componentes/UI';
import { toast } from 'react-hot-toast';

interface EscolaSistema {
    id: string;
    nome: string;
    slug: string;
    totalAlunos: number;
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    criadoEm: string;
}

interface DadosSaude {
    totalAcessosHoje: number;
    alertasPendentes: number;
    statusDB: string;
    corDoDia: string;
}

export function PaginaGestaoEscolas() {
    const [busca, definirBusca] = useState('');
    const [escolas, definirEscolas] = useState<EscolaSistema[]>([]);
    const [saude, definirSaude] = useState<DadosSaude | null>(null);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<string | null>(null);

    // Modal Nova Unidade
    const [modalAberto, definirModalAberto] = useState(false);
    const [criando, definirCriando] = useState(false);
    const [form, definirForm] = useState({
        nome_escola: '',
        id: '',
        email_admin: '',
        nome_admin: ''
    });

    const carregarDados = async () => {
        try {
            definirCarregando(true);
            const [respEscolas, respSaude] = await Promise.all([
                api.obter<EscolaSistema[]>('/central/escolas'),
                api.obter<DadosSaude>('/central/saude')
            ]);
            definirEscolas(respEscolas);
            definirSaude(respSaude);
        } catch (err: any) {
            console.error('Erro na central:', err);
            definirErro(err.message || 'Falha na conexão com a infraestrutura.');
        } finally {
            definirCarregando(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const lidarComCriacao = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            definirCriando(true);
            await api.enviar('/central/escolas', form);
            toast.success('Unidade configurada com sucesso!');
            definirModalAberto(false);
            definirForm({ nome_escola: '', id: '', email_admin: '', nome_admin: '' });
            carregarDados();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar unidade.');
        } finally {
            definirCriando(false);
        }
    };

    const escolasFiltradas = escolas.filter(e =>
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        e.slug.toLowerCase().includes(busca.toLowerCase())
    );

    if (carregando) return <SkeletonCentral />;

    if (erro) return <ErroCentral erro={erro} onContexto={carregarDados} />;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Barra de Saúde (Real Time Health) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <HealthMetric 
                    label="Volume Hoje" 
                    valor={saude?.totalAcessosHoje || 0} 
                    sub="Batidas de QR Code" 
                    icone={Activity} 
                    cor="emerald"
                />
                <HealthMetric 
                    label="Riscos Pendentes" 
                    valor={saude?.alertasPendentes || 0} 
                    sub="Alertas não analisados" 
                    icone={ShieldAlert} 
                    cor="red"
                />
                <HealthMetric 
                    label="Status DB" 
                    valor={saude?.statusDB || 'ONLINE'} 
                    sub="D1 Infrastructure" 
                    icone={Server} 
                    cor="slate"
                />
                <HealthMetric 
                    label="Cor do Dia" 
                    valor={saude?.corDoDia || '#000'} 
                    sub="Sincronia Visual" 
                    icone={Zap} 
                    customColor={saude?.corDoDia}
                />
            </div>

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white border border-slate-200 p-10 rounded-[32px] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 blur-[100px] rounded-full pointer-events-none group-hover:bg-slate-100 transition-colors duration-700"></div>

                <div className="flex items-center gap-8 relative z-10">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-200 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <Building2 size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Ecossistema Educacional</p>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Unidades de Ensino</h2>
                    </div>
                </div>

                <Botao 
                    onClick={() => definirModalAberto(true)}
                    icone={Plus} 
                    tamanho="lg" 
                    className="relative z-10 bg-slate-900 text-white hover:bg-black border-none rounded-2xl px-10 h-16 shadow-xl shadow-slate-200 font-black uppercase tracking-widest text-[11px] active:scale-95 transition-all"
                >
                    Nova Instituição
                </Botao>
            </header>

            {/* Busca */}
            <BarraFiltro className="bg-white border-slate-100 shadow-sm p-3 rounded-2xl">
                <InputBusca
                    icone={Search}
                    placeholder="Pesquisar por nome, slug ou identificador da unidade..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-50 border-transparent focus:bg-white focus:border-slate-900 focus:ring-0 text-slate-900 placeholder:text-slate-300 font-bold text-sm h-14 rounded-xl px-4"
                />
            </BarraFiltro>

            {/* Tabela Unidades */}
            <CartaoConteudo className="bg-white border-slate-100 rounded-[32px] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instituição / ID</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status Operacional</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data de Ativação</th>
                                <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {escolasFiltradas.length === 0 ? (
                                <VazioCentral />
                            ) : (
                                escolasFiltradas.map((escola) => (
                                    <tr key={escola.id} className="hover:bg-slate-50/50 transition-all duration-300 group cursor-default">
                                        <td className="py-8 px-10">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-slate-900 uppercase italic leading-none">{escola.nome}</span>
                                                <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">{escola.slug}</span>
                                            </div>
                                        </td>
                                        <td className="py-8 px-10 text-center">
                                            <BadgeStatus status={escola.status} />
                                        </td>
                                        <td className="py-8 px-10">
                                            <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {new Date(escola.criadoEm).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-8 px-10 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                                {/* Botão Teletransporte */}
                                                <a 
                                                    href={`/${escola.slug}/admin`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    title="Governar Unidade"
                                                    className="h-10 w-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                >
                                                    <ExternalLink size={16} strokeWidth={2.5} />
                                                </a>
                                                <div className="w-px h-6 bg-slate-100"></div>
                                                <Botao variante="ghost" tamanho="sm" icone={Edit2} className="hover:bg-slate-100 rounded-xl transition-all h-10 w-10 flex items-center justify-center p-0" />
                                                <Botao variante="ghost" tamanho="sm" icone={Ban} className="hover:bg-red-50 text-red-600 rounded-xl transition-all h-10 w-10 flex items-center justify-center p-0" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>

            {/* Modal de Onboarding */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-white/20 overflow-hidden relative animate-scale-up">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl rotate-3 shadow-lg">
                                    <Plus size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Onboarding de Unidade</h3>
                            </div>
                            <button onClick={() => definirModalAberto(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                                <X size={24} className="text-slate-300" />
                            </button>
                        </div>
                        
                        <form onSubmit={lidarComCriacao} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Escola</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="Ex: CEM 03 de Taguatinga" 
                                        value={form.nome_escola}
                                        onChange={(e) => definirForm({...form, nome_escola: e.target.value})}
                                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all placeholder:text-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slug ID (URL)</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="ex: cem03-taguatinga" 
                                        value={form.id}
                                        onChange={(e) => definirForm({...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all placeholder:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 space-y-6">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 text-center">Administrador Inicial</p>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Diretor/Coord.</label>
                                    <input 
                                        required
                                        type="text"
                                        value={form.nome_admin}
                                        onChange={(e) => definirForm({...form, nome_admin: e.target.value})}
                                        className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                    <input 
                                        required
                                        type="email"
                                        value={form.email_admin}
                                        onChange={(e) => definirForm({...form, email_admin: e.target.value})}
                                        className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-wide leading-relaxed italic">
                                        Ao criar, a Central gerará chaves criptográficas ECDSA exclusivas e definirá o acesso mestre.
                                    </p>
                                </div>
                                <Botao 
                                    type="submit"
                                    loading={criando}
                                    className="px-10 h-16 bg-slate-900 text-white rounded-2xl hover:bg-black font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-slate-200 min-w-[200px]"
                                >
                                    Finalizar Setup
                                </Botao>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function HealthMetric({ label, valor, sub, icone: Icone, cor, customColor }: any) {
    return (
        <CartaoConteudo className="bg-white border-slate-50 p-6 rounded-3xl flex items-center gap-5 group hover:border-slate-100 transition-all shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500`}
                 style={{ backgroundColor: customColor ? `${customColor}10` : 'transparent', color: customColor || 'inherit' }}>
                {!customColor && <div className={`w-full h-full rounded-2xl opacity-10 ${cor === 'emerald' ? 'bg-emerald-500' : cor === 'red' ? 'bg-red-500' : 'bg-slate-900'}`} />}
                <Icone size={20} className="absolute" style={{ color: customColor || 'inherit' }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">{label}</p>
                <h4 className="text-xl font-black text-slate-900 truncate uppercase italic tracking-tighter leading-none">{valor}</h4>
                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">{sub}</p>
            </div>
        </CartaoConteudo>
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
    return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white border border-slate-100 italic">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Suspensa
        </span>
    );
}

function SkeletonCentral() {
    return (
        <div className="space-y-8 animate-pulse pb-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-28 bg-white border-slate-50 rounded-3xl" />
                ))}
            </div>
            <div className="h-44 bg-white border-slate-200 rounded-[32px]" />
            <div className="h-16 bg-white border-slate-100 rounded-2xl" />
            <div className="h-96 bg-white border-slate-100 rounded-[32px]" />
        </div>
    );
}

function ErroCentral({ erro, onContexto }: any) {
    return (
        <div className="bg-white border border-slate-200 p-16 rounded-[40px] flex flex-col items-center text-center gap-8 max-w-xl mx-auto shadow-2xl shadow-slate-200/50 my-20">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                <AlertTriangle size={36} strokeWidth={2.5} />
            </div>
            <div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tighter italic">Infraestrutura Indisponível</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-wide">{erro}</p>
            </div>
            <Botao variante="primario" className="px-10 py-5 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all font-black uppercase tracking-widest text-[11px]" onClick={onContexto}>Recalibrar Frequência</Botao>
        </div>
    );
}

function VazioCentral() {
    return (
        <tr>
            <td colSpan={4} className="py-32 text-center">
                <div className="flex flex-col items-center gap-6 grayscale opacity-20">
                    <Search size={64} strokeWidth={1} className="text-slate-900" />
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Vácuo de Informação</p>
                </div>
            </td>
        </tr>
    );
}
