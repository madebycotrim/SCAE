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

    // Modal Nova Unidade (Multi-Phase)
    const [modalAberto, definirModalAberto] = useState(false);
    const [fase, definirFase] = useState(1);
    const [criando, definirCriando] = useState(false);
    const [form, definirForm] = useState({
        nome_escola: '',
        id: '',
        dominio_email: '',
        cor_primaria: '#000000',
        cor_secundaria: '#ffffff',
        logo_url: '',
        config_qr_dinamico: false,
        tts_ativado: true
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
            toast.success('Protocolo de unidade ativado!');
            definirModalAberto(false);
            definirFase(1);
            definirForm({ 
                nome_escola: '', id: '', dominio_email: '', 
                cor_primaria: '#000000', cor_secundaria: '#ffffff', 
                logo_url: '', config_qr_dinamico: false, tts_ativado: true 
            });
            carregarDados();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao inicializar unidade.');
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
        <div className="space-y-16 animate-fade-in font-sans selection:bg-slate-950 selection:text-white">
            {/* Sistema de Telemetria Global - Estilo Centro de Comando */}
            <section className="relative">
                <div className="absolute inset-0 bg-slate-100/30 blur-3xl rounded-[64px] -z-10"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-0 rounded-[40px] overflow-hidden border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.03)] divide-x divide-slate-100">
                    <HealthMetric 
                        label="Fluxo / 24h" 
                        valor={saude?.totalAcessosHoje || 0} 
                        sub="Sinais de Presença" 
                        icone={Activity} 
                    />
                    <HealthMetric 
                        label="Incidentes" 
                        valor={saude?.alertasPendentes || 0} 
                        sub="Nós Críticos" 
                        icone={ShieldAlert} 
                    />
                    <HealthMetric 
                        label="Status Infra" 
                        valor={saude?.statusDB || 'STABLE'} 
                        sub="D1 Connectivity" 
                        icone={Server} 
                    />
                    <HealthMetric 
                        label="Auth Specs" 
                        valor={saude?.corDoDia || '#000'} 
                        sub="Color Spectrum" 
                        icone={Zap} 
                        customColor={saude?.corDoDia}
                    />
                </div>
            </section>

            {/* Cabeçalho Principal - Central Intelligence */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-950 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-slate-200 rotate-2 group hover:rotate-0 transition-all duration-700">
                            <Building2 size={36} strokeWidth={2} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none">Global Infrastructure</p>
                            <h1 className="text-6xl font-[900] text-slate-950 uppercase tracking-tighter italic leading-none">Control <span className="text-slate-200 not-italic font-extralight tracking-tight">Center</span></h1>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                    <div className="bg-white p-2 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-2 w-full sm:w-[400px]">
                        <Search className="ml-4 text-slate-300" size={18} />
                        <input 
                            type="text" 
                            placeholder="Localizar unidade operacional..."
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-900 placeholder:text-slate-200 w-full h-12"
                            value={busca}
                            onChange={(e) => definirBusca(e.target.value)}
                        />
                    </div>
                    <Botao 
                        onClick={() => definirModalAberto(true)}
                        icone={Plus} 
                        tamanho="lg" 
                        className="bg-black text-white hover:bg-slate-800 border-none rounded-[24px] px-12 h-16 shadow-2xl shadow-slate-200 font-black uppercase tracking-[0.2em] text-[11px] whitespace-nowrap active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Nova Unidade
                    </Botao>
                </div>
            </header>

            {/* Registro de Ativos de Rede (Escolas) */}
            <CartaoConteudo className="border-slate-100 shadow-[0_40px_100px_rgba(0,0,0,0.04)] rounded-[48px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="py-10 px-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Asset Identity</th>
                                <th className="py-10 px-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center">Operation Mode</th>
                                <th className="py-10 px-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Lifecycle Index</th>
                                <th className="py-10 px-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right">Directives</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {escolasFiltradas.length === 0 ? (
                                <VazioCentral />
                            ) : (
                                escolasFiltradas.map((escola) => (
                                    <tr key={escola.id} className="hover:bg-slate-50/50 transition-all duration-500 group">
                                        <td className="py-12 px-12">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-lg font-black text-slate-950 uppercase italic tracking-tight group-hover:tracking-normal transition-all duration-500">{escola.nome}</span>
                                                <span className="text-[11px] font-mono font-bold text-slate-300 group-hover:text-slate-500 uppercase tracking-widest transition-colors leading-none">{escola.slug}</span>
                                            </div>
                                        </td>
                                        <td className="py-12 px-12 text-center">
                                            <BadgeStatus status={escola.status} />
                                        </td>
                                        <td className="py-12 px-12">
                                            <div className="inline-flex flex-col gap-1 bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none">Deployment</span>
                                                <span className="text-[10px] font-mono font-black text-slate-900">
                                                    {new Date(escola.criadoEm).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-12 px-12 text-right">
                                            <div className="flex items-center justify-end gap-5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                                <a 
                                                    href={`/${escola.slug}/admin`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    title="Terminal Admin"
                                                    className="h-14 w-14 bg-white text-slate-950 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-slate-100"
                                                >
                                                    <ExternalLink size={20} strokeWidth={2.5} />
                                                </a>
                                                <div className="w-px h-10 bg-slate-100"></div>
                                                <Botao variante="ghost" tamanho="sm" icone={Edit2} className="hover:bg-slate-100 rounded-2xl transition-all h-14 w-14 flex items-center justify-center p-0" />
                                                <Botao variante="ghost" tamanho="sm" icone={Ban} className="hover:bg-rose-50 text-rose-500 rounded-2xl transition-all h-14 w-14 flex items-center justify-center p-0" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>

            {/* Modal Onboarding - Protocolo de Inicialização Multi-Fases */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-2xl rounded-[64px] shadow-2xl border border-white/20 overflow-hidden relative animate-scale-up">
                        {/* Header do Modal com Indicador de Progresso */}
                        <div className="p-10 border-b border-slate-50">
                            <div className="flex justify-between items-center mb-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] leading-none">Onboarding Phase 0{fase}</p>
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none text-highlight">
                                        {fase === 1 ? 'Identidade Core' : fase === 2 ? 'Visual & Branding' : 'Configurações'}
                                    </h3>
                                </div>
                                <button onClick={() => { definirModalAberto(false); definirFase(1); }} className="p-3 hover:bg-slate-50 rounded-full transition-colors group">
                                    <X size={28} className="text-slate-300 group-hover:text-slate-950 transition-colors" />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                {[1, 2, 3].map(step => (
                                    <div 
                                        key={step} 
                                        className={`h-1.5 rounded-full transition-all duration-500 ${fase >= step ? 'flex-[2] bg-slate-950 shadow-sm' : 'flex-1 bg-slate-100'}`}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <form onSubmit={lidarComCriacao} className="p-10">
                            <div className="min-h-[300px]">
                                {/* FASE 1: Identidade */}
                                {fase === 1 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Instituição</label>
                                                <input required type="text" placeholder="Ex: CEM 01 de Brasília" value={form.nome_escola}
                                                    onChange={(e) => definirForm({...form, nome_escola: e.target.value})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Único (Slug)</label>
                                                <input required type="text" placeholder="cem-01-bsb" value={form.id}
                                                    onChange={(e) => definirForm({...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 text-base font-mono font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domínio de E-mail Autorizado</label>
                                            <input required type="text" placeholder="@edu.se.df.gov.br" value={form.dominio_email}
                                                onChange={(e) => definirForm({...form, dominio_email: e.target.value})}
                                                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                            />
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1 italic">Apenas usuários com este domínio poderão acessar o painel administrativo.</p>
                                        </div>
                                    </div>
                                )}

                                {/* FASE 2: Visual & Branding */}
                                {fase === 2 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo URL (Icone)</label>
                                            <input type="url" placeholder="https://exemplo.com/logo.png" value={form.logo_url}
                                                onChange={(e) => definirForm({...form, logo_url: e.target.value})}
                                                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor Primária</label>
                                                <div className="flex gap-4">
                                                    <input type="color" value={form.cor_primaria}
                                                        onChange={(e) => definirForm({...form, cor_primaria: e.target.value})}
                                                        className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0"
                                                    />
                                                    <input type="text" value={form.cor_primaria}
                                                        onChange={(e) => definirForm({...form, cor_primaria: e.target.value})}
                                                        className="flex-1 h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 text-sm font-mono font-bold text-slate-900 focus:bg-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor Secundária</label>
                                                <div className="flex gap-4">
                                                    <input type="color" value={form.cor_secundaria}
                                                        onChange={(e) => definirForm({...form, cor_secundaria: e.target.value})}
                                                        className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0"
                                                    />
                                                    <input type="text" value={form.cor_secundaria}
                                                        onChange={(e) => definirForm({...form, cor_secundaria: e.target.value})}
                                                        className="flex-1 h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 text-sm font-mono font-bold text-slate-900 focus:bg-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FASE 3: Configurações */}
                                {fase === 3 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                        <div className="bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 grid grid-cols-1 gap-6">
                                            <div className="flex items-center justify-between group">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight italic">Síntese de Voz (TTS)</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anunciar nomes na portaria via áudio.</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => definirForm({...form, tts_ativado: !form.tts_ativado})}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${form.tts_ativado ? 'bg-slate-950' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${form.tts_ativado ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            
                                            <div className="w-full h-px bg-slate-100" />

                                            <div className="flex items-center justify-between group">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight italic">QR Dinâmico (Secured)</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerar novo QR a cada acesso (Anti-fraude).</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => definirForm({...form, config_qr_dinamico: !form.config_qr_dinamico})}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${form.config_qr_dinamico ? 'bg-slate-950' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${form.config_qr_dinamico ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 bg-slate-950 rounded-[32px] text-white flex items-center gap-4">
                                            <ShieldAlert className="text-slate-500" size={24} />
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                                A ativação final gerará as chaves ECDSA P-256 mestras. Este processo é irreversível e cria um novo tenant isolado na infraestrutura.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controles do Footer */}
                            <div className="mt-12 flex items-center justify-between gap-6 border-t border-slate-50 pt-10">
                                {fase > 1 ? (
                                    <Botao 
                                        type="button" 
                                        variante="ghost" 
                                        onClick={() => definirFase(fase - 1)}
                                        className="px-10 h-16 rounded-[24px] uppercase font-black text-[10px] tracking-widest text-slate-400 hover:text-slate-950"
                                    >
                                        Voltar
                                    </Botao>
                                ) : <div />}

                                {fase < 3 ? (
                                    <Botao 
                                        type="button"
                                        onClick={() => {
                                            if (fase === 1 && (!form.nome_escola || !form.id || !form.dominio_email)) return toast.error('Complete a identidade core.');
                                            definirFase(fase + 1);
                                        }}
                                        className="px-12 h-16 bg-slate-950 text-white rounded-[28px] uppercase font-black text-[11px] tracking-[0.2em] shadow-xl shadow-slate-200"
                                    >
                                        Próximo Passo
                                    </Botao>
                                ) : (
                                    <Botao 
                                        type="submit"
                                        loading={criando}
                                        disabled={criando}
                                        className="px-16 h-20 bg-black text-white rounded-[32px] hover:bg-slate-800 font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-slate-200 min-w-[240px] active:scale-95 transition-all text-highlight"
                                    >
                                        {criando ? 'Protocolando...' : 'Inicializar Unidade'}
                                    </Botao>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function HealthMetric({ label, valor, sub, icone: Icone, customColor }: any) {
    return (
        <div className="p-10 flex flex-col gap-6 group hover:bg-slate-50 transition-all duration-700 cursor-default">
            <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}
                     style={{ backgroundColor: customColor ? `${customColor}10` : '#f8fafc', color: customColor || '#64748b' }}>
                    <Icone size={18} strokeWidth={2.5} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-950 transition-colors"></div>
            </div>
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] leading-none">{label}</p>
                <h4 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">{valor}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-40 leading-none">{sub}</p>
            </div>
        </div>
    );
}

function BadgeStatus({ status }: { status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE' }) {
    if (status === 'ATIVA') {
        return (
            <span className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 bg-white border border-slate-100 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse"></div> Operational
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 bg-slate-50 border border-slate-100 italic">
            <div className="w-2 h-2 rounded-full bg-slate-200"></div> Offline
        </span>
    );
}

function SkeletonCentral() {
    return (
        <div className="space-y-16 animate-pulse pb-20">
            <div className="h-44 bg-white border-slate-200 rounded-[48px]" />
            <div className="flex justify-between">
                <div className="w-96 h-20 bg-white rounded-[32px]" />
                <div className="w-64 h-20 bg-white rounded-[32px]" />
            </div>
            <div className="h-[600px] bg-white rounded-[48px]" />
        </div>
    );
}

function ErroCentral({ erro, onContexto }: any) {
    return (
        <div className="bg-white border border-slate-200 p-20 rounded-[64px] flex flex-col items-center text-center gap-10 max-w-2xl mx-auto shadow-2xl shadow-slate-200/50 my-20">
            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                <AlertTriangle size={44} strokeWidth={2} />
            </div>
            <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">Signal Interruption</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed max-w-md mx-auto">{erro}</p>
            </div>
            <Botao variante="primario" className="px-16 py-6 bg-black text-white rounded-[28px] hover:bg-slate-800 transition-all font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl" onClick={onContexto}>Resume Protocol</Botao>
        </div>
    );
}

function VazioCentral() {
    return (
        <tr>
            <td colSpan={4} className="py-40 text-center">
                <div className="flex flex-col items-center gap-8 grayscale opacity-10">
                    <Search size={80} strokeWidth={1} className="text-slate-900" />
                    <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.6em]">Zero Operations Found</p>
                </div>
            </td>
        </tr>
    );
}
