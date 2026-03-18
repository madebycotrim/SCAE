import { useState, useEffect } from 'react';
import { 
    Building2, Search, Edit2, Ban, Eye, AlertTriangle, Plus, 
    ExternalLink, Activity, Server, ShieldAlert, X, Loader2, Fingerprint, Zap,
    Trash2, QrCode
} from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@/compartilhado/componentes/UI';
import { toast } from 'react-hot-toast';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

interface EscolaSistema {
    id: string;
    nome: string;
    slug: string;
    dominioEmail: string;
    totalAlunos: number;
    limiteAlunos: number;
    limiteTerminais: number;
    contatoSuporte: string;
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    criadoEm: string;
}


export function PaginaGestaoEscolas() {
    const [busca, definirBusca] = useState('');
    const [escolas, definirEscolas] = useState<EscolaSistema[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<string | null>(null);

    // Modal Nova Unidade (Multi-Phase)
    const [modalAberto, definirModalAberto] = useState(false);
    const [fase, definirFase] = useState(1);
    const [criando, definirCriando] = useState(false);
    const [editandoId, definirEditandoId] = useState<string | null>(null);
    const [form, definirForm] = useState({
        nome_escola: '',
        id: '',
        dominio_email: '',
        cor_primaria: '#030712',
        cor_secundaria: '#ffffff',
        logo_url: '',
        config_qr_dinamico: false,
        tts_ativado: true,
        saida_obrigatoria: true,
        metodo_acesso: 'QRCODE' as 'QRCODE' | 'FACIAL' | 'DIGITAL',
        limite_alunos: 1000,
        limite_terminais: 5,
        retencao_dados: 730,
        contato_suporte: ''
    });
    const [confirmacao, definirConfirmacao] = useState<{aberto: boolean, acao: () => void, titulo: string, mensagem: string, variante?: 'perigoso' | 'padrao'} | null>(null);

    const formPadrao = {
        nome_escola: '', id: '', dominio_email: '', 
        cor_primaria: '#030712', cor_secundaria: '#ffffff', 
        logo_url: '', config_qr_dinamico: false, tts_ativado: true,
        saida_obrigatoria: true, metodo_acesso: 'QRCODE' as 'QRCODE' | 'FACIAL' | 'DIGITAL',
        limite_alunos: 1000, limite_terminais: 5, retencao_dados: 730, contato_suporte: ''
    };

    const carregarDados = async () => {
        try {
            if (escolas.length === 0) {
                definirCarregando(true);
            }
            const dadosEscolas = await api.obter<EscolaSistema[]>('/central/escolas');
            definirEscolas(dadosEscolas);
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

    const abrirEdicao = async (escola: EscolaSistema) => {
        try {
            const dadosCompletos = await api.obter<any>(`/central/escolas/${escola.id}`);
            definirForm({
                nome_escola: dadosCompletos.nome_escola || escola.nome,
                id: dadosCompletos.id || escola.slug,
                dominio_email: dadosCompletos.dominio_email || '',
                cor_primaria: dadosCompletos.cor_primaria || '#030712',
                cor_secundaria: dadosCompletos.cor_secundaria || '#ffffff',
                logo_url: dadosCompletos.logo_url || '',
                config_qr_dinamico: !!dadosCompletos.config_qr_dinamico,
                tts_ativado: dadosCompletos.tts_ativado !== 0,
                saida_obrigatoria: dadosCompletos.saida_obrigatoria !== 0,
                metodo_acesso: dadosCompletos.metodo_acesso || 'QRCODE',
                limite_alunos: dadosCompletos.limite_alunos || 1000,
                limite_terminais: dadosCompletos.limite_terminais || 5,
                retencao_dados: dadosCompletos.retencao_dados || 730,
                contato_suporte: dadosCompletos.contato_suporte || ''
            });
            definirEditandoId(escola.id);
            definirFase(1);
            definirModalAberto(true);
        } catch (err: any) {
            toast.error('O sistema não conseguiu recuperar os dados completos desta unidade.');
        }
    };

    const alternarStatus = (escola: EscolaSistema) => {
        const novoStatus = escola.status === 'ATIVA' ? 'SUSPENSA' : 'ATIVA';
        const acao = novoStatus === 'ATIVA' ? 'reativar' : 'suspender';
        
        definirConfirmacao({
            aberto: true,
            titulo: `${acao.charAt(0).toUpperCase() + acao.slice(1)} Unidade`,
            mensagem: `Deseja ${acao} o sinal da unidade ${escola.nome}?`,
            variante: novoStatus === 'SUSPENSA' ? 'perigoso' : 'padrao',
            acao: async () => {
                try {
                    await api.atualizar(`/central/escolas/${escola.id}`, { status: novoStatus });
                    toast.success(`Unidade ${escola.nome} ${novoStatus === 'ATIVA' ? 'operacional' : 'suspensa'}.`);
                    carregarDados();
                } catch (err: any) {
                    toast.error('Falha ao comunicar mudança de status para a infraestrutura.');
                }
            }
        });
    };

    const lidarComExclusao = async (id: string, nome: string) => {
        definirConfirmacao({
            aberto: true,
            titulo: 'EXCLUSÃO ATÔMICA DA UNIDADE',
            mensagem: `ATENÇÃO: Você está prestes a apagar a escola "${nome}" e TODOS OS DADOS VINCULADOS (alunos, registros, usuários, turmas). Esta ação é irreversível e limpa completamente o tenant do banco de dados D1. Deseja prosseguir?`,
            variante: 'perigoso',
            acao: async () => {
                try {
                    await api.remover(`/central/escolas/${id}`);
                    toast.success('Unidade e todos os seus dados foram expurgados!');
                    carregarDados();
                } catch (err: any) {
                    toast.error(err.mensagem || 'Falha no expurgo da unidade.');
                }
            }
        });
    };

    const lidarComCriacao = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevenção de submissão precoce
        if (fase < 3) {
            if (fase === 1 && (!form.nome_escola || !form.id || !form.dominio_email)) {
                return toast.error('Complete a identidade core antes de avançar.');
            }
            definirFase(fase + 1);
            return;
        }

        try {
            definirCriando(true);
            
            if (editandoId) {
                await api.atualizar(`/central/escolas/${editandoId}`, form);
                toast.success('Diretrizes da unidade atualizadas!');
            } else {
                await api.enviar('/central/escolas', form);
                toast.success('Protocolo de unidade ativado!');
            }

            definirModalAberto(false);
            definirEditandoId(null);
            definirFase(1);
            definirForm({ ...formPadrao });
            carregarDados();
        } catch (err: any) {
            toast.error(err.message || 'Erro no processamento do protocolo.');
        } finally {
            definirCriando(false);
        }
    };

    const escolasFiltradas = escolas.filter(e =>
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        e.slug.toLowerCase().includes(busca.toLowerCase())
    );

    // Solo mostra esqueleto se estiver carregando e não houver dados
    if (carregando && escolas.length === 0) return <SkeletonCentral />;

    if (erro) return <ErroCentral erro={erro} onContexto={carregarDados} />;
    return (
        <div className="space-y-16 animate-fade-in font-sans selection:bg-slate-950 selection:text-white">
            {/* Cabeçalho Principal - Central Intelligence */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-md rotate-2 group hover:rotate-0 transition-all duration-700">
                            <Building2 size={36} strokeWidth={2} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none">Infraestrutura Global</p>
                            <h1 className="text-6xl font-[900] text-slate-950 uppercase tracking-tighter italic leading-none">Central de <span className="text-slate-200 not-italic font-extralight tracking-tight">Comando</span></h1>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                    <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 w-full sm:w-[400px]">
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
                        onClick={() => {
                            definirEditandoId(null);
                            definirForm({ ...formPadrao });
                            definirFase(1);
                            definirModalAberto(true);
                        }}
                        icone={Plus} 
                        tamanho="lg" 
                        className="bg-black text-white hover:bg-slate-800 border-none rounded-2xl px-12 h-16 shadow-md font-black uppercase tracking-[0.2em] text-[11px] whitespace-nowrap active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Nova Unidade
                    </Botao>
                </div>
            </header>

            {/* Registro de Ativos de Rede (Escolas) */}
            <CartaoConteudo className="border-slate-100 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Identidade de Rede</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Domínio Adm</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Cota / Capacidade</th>
                                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status Infra</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações de Comando</th>
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
                                        <td className="px-6 py-8">
                                            <span className="text-[11px] font-mono font-bold text-slate-300 group-hover:text-slate-500 uppercase tracking-widest transition-colors leading-none">{escola.dominioEmail}</span>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>Ocupação</span>
                                                    <span>{escola.totalAlunos || 0} / {escola.limiteAlunos || 1000}</span>
                                                </div>
                                                <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-slate-900 transition-all duration-1000" 
                                                        style={{ width: `${Math.min(((escola.totalAlunos || 0) / (escola.limiteAlunos || 1000)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <BadgeStatus status={escola.status} />
                                        </td>
                                        <td className="py-12 px-12 text-right">
                                            <div className="flex items-center justify-end gap-5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 relative z-20">
                                                <button 
                                                    onClick={() => lidarComExclusao(escola.id, escola.nome)}
                                                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Expurgar Unidade"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                                <a 
                                                    href={`/${escola.slug}/admin/painel`}
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    title="Terminal Administrativo"
                                                    className="h-14 w-14 bg-white text-slate-950 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm border border-slate-100 cursor-pointer active:scale-90"
                                                >
                                                    <ExternalLink size={20} strokeWidth={2.5} />
                                                </a>
                                                
                                                <div className="w-px h-10 bg-slate-100"></div>
                                                
                                                <Botao 
                                                    variante="secundario" 
                                                    tamanho="sm" 
                                                    icone={Edit2} 
                                                    className="rounded-2xl h-14 w-14 flex items-center justify-center p-0 border-slate-100 shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        abrirEdicao(escola);
                                                    }}
                                                />
                                                
                                                <Botao 
                                                    variante="secundario" 
                                                    tamanho="sm" 
                                                    icone={escola.status === 'ATIVA' ? Ban : Zap} 
                                                    className={`${escola.status === 'ATIVA' ? 'text-rose-500' : 'text-emerald-500'} rounded-2xl h-14 w-14 flex items-center justify-center p-0 border-slate-100 shadow-sm`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        alternarStatus(escola);
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>

            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg border border-white/20 overflow-hidden relative animate-scale-up">
                        {/* Header do Modal com Indicador de Progresso */}
                        <div className="p-10 border-b border-slate-50">
                            <div className="flex justify-between items-center mb-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] leading-none">Fase de Onboarding 0{fase}</p>
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none text-highlight">
                                        {fase === 1 ? 'Fundamento Estrutural' : fase === 2 ? 'Design & Estética' : fase === 3 ? 'Fluxo Operacional' : 'Governança & Segurança'}
                                    </h3>
                                </div>
                                <button onClick={() => { definirModalAberto(false); definirFase(1); }} className="p-3 hover:bg-slate-50 rounded-full transition-colors group">
                                    <X size={28} className="text-slate-300 group-hover:text-slate-950 transition-colors" />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(step => (
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
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Único (Slug)</label>
                                                <input required type="text" placeholder="cem-01-bsb" value={form.id}
                                                    onChange={(e) => definirForm({...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-mono font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domínio de E-mail Autorizado</label>
                                            <input required type="text" placeholder="@edu.se.df.gov.br" value={form.dominio_email}
                                                onChange={(e) => definirForm({...form, dominio_email: e.target.value})}
                                                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
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
                                                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
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
                                                        className="flex-1 h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-mono font-bold text-slate-900 focus:bg-white outline-none"
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
                                                        className="flex-1 h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-mono font-bold text-slate-900 focus:bg-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FASE 3: Fluxo Operacional */}
                                {fase === 3 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                        <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100 space-y-8">
                                            <div className="flex items-center justify-between group">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight italic">Registrar Saída</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desativar para evitar congestionamento no portão.</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => definirForm({...form, saida_obrigatoria: !form.saida_obrigatoria})}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${form.saida_obrigatoria ? 'bg-slate-950' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${form.saida_obrigatoria ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            <div className="w-full h-px bg-slate-100" />

                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight italic">Método de Autenticação Primário</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tecnologia padrão para identificação dos alunos.</p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => definirForm({...form, metodo_acesso: 'QRCODE'})}
                                                        className={`py-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.metodo_acesso === 'QRCODE' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                                                    >
                                                        <QrCode size={20} className={form.metodo_acesso === 'QRCODE' ? 'text-blue-400' : 'text-slate-200'} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">QR Code</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => definirForm({...form, metodo_acesso: 'FACIAL'})}
                                                        className={`py-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.metodo_acesso === 'FACIAL' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                                                    >
                                                        <Eye size={20} className={form.metodo_acesso === 'FACIAL' ? 'text-blue-400' : 'text-slate-200'} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Facial</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => definirForm({...form, metodo_acesso: 'DIGITAL'})}
                                                        className={`py-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.metodo_acesso === 'DIGITAL' ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                                                    >
                                                        <Fingerprint size={20} className={form.metodo_acesso === 'DIGITAL' ? 'text-blue-400' : 'text-slate-200'} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Digital</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FASE 4: Governança & Segurança */}
                                {fase === 4 && (
                                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade de Alunos</label>
                                                <input type="number" placeholder="Ex: 500" value={form.limite_alunos}
                                                    onChange={(e) => definirForm({...form, limite_alunos: parseInt(e.target.value) || 0})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Máximo de Terminais (Tablets)</label>
                                                <input type="number" placeholder="Ex: 5" value={form.limite_terminais}
                                                    onChange={(e) => definirForm({...form, limite_terminais: parseInt(e.target.value) || 0})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Retenção de Logs (Dias)</label>
                                                <select value={form.retencao_dados}
                                                    onChange={(e) => definirForm({...form, retencao_dados: parseInt(e.target.value)})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none"
                                                >
                                                    <option value={180}>180 Dias (Mínimo Marco Civil)</option>
                                                    <option value={365}>365 Dias (1 Ano Letivo)</option>
                                                    <option value={730}>730 Dias (2 Anos - Padrão SCAE)</option>
                                                    <option value={1825}>1825 Dias (5 Anos - Auditoria Pública)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Suporte Técnico da Unidade</label>
                                                <input type="text" placeholder="E-mail ou WhatsApp de TI" value={form.contato_suporte}
                                                    onChange={(e) => definirForm({...form, contato_suporte: e.target.value})}
                                                    className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100 space-y-6">
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
                                        
                                        <div className="p-6 bg-slate-950 rounded-2xl text-white flex items-center gap-4">
                                            <ShieldAlert className="text-slate-500" size={24} />
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed opacity-80">
                                                A ativação final gerará as chaves ECDSA P-256 mestras de segurança. Este processo é irreversível e cria um novo tenant isolado na infraestrutura.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controles do Footer */}
                            <div className="mt-12 flex items-center justify-between gap-6 border-t border-slate-50 pt-10">
                                {fase > 1 ? (
                                    <Botao 
                                        key="btn-voltar"
                                        type="button" 
                                        variante="ghost" 
                                        onClick={() => definirFase(fase - 1)}
                                        className="px-10 h-16 rounded-2xl uppercase font-black text-[10px] tracking-widest text-slate-400 hover:text-slate-950"
                                    >
                                        Voltar
                                    </Botao>
                                ) : <div key="vazio-voltar" />}

                                {fase < 4 ? (
                                    <Botao 
                                        key="btn-proximo"
                                        type="button"
                                        onClick={() => {
                                            if (fase === 1 && (!form.nome_escola || !form.id || !form.dominio_email)) return toast.error('Complete a identidade core.');
                                            definirFase(fase + 1);
                                        }}
                                        className="px-12 h-16 bg-slate-950 text-white rounded-2xl uppercase font-black text-[11px] tracking-[0.2em] shadow-md"
                                    >
                                        Próximo Passo
                                    </Botao>
                                ) : (
                                    <Botao 
                                        key="btn-finalizar"
                                        type="submit"
                                        loading={criando}
                                        disabled={criando}
                                        className="px-16 h-20 bg-black text-white rounded-2xl hover:bg-slate-800 font-black uppercase text-[12px] tracking-[0.3em] shadow-md min-w-[240px] active:scale-95 transition-all text-highlight"
                                    >
                                        {criando ? 'Protocolando...' : editandoId ? 'Atualizar Diretrizes' : 'Inicializar Unidade'}
                                    </Botao>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmacao?.aberto && (
                <ModalConfirmacao
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    aoConfirmar={() => {
                        confirmacao.acao();
                        definirConfirmacao(null);
                    }}
                    aoCancelar={() => definirConfirmacao(null)}
                    variante={confirmacao.variante}
                />
            )}
        </div>
    );
}

function BadgeStatus({ status }: { status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE' }) {
    if (status === 'ATIVA') {
        return (
            <span className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 bg-white border border-slate-100 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse"></div> Operacional
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
            <div className="h-44 bg-white border-slate-200 rounded-2xl" />
            <div className="flex justify-between">
                <div className="w-96 h-20 bg-white rounded-2xl" />
                <div className="w-64 h-20 bg-white rounded-2xl" />
            </div>
            <div className="h-[600px] bg-white rounded-2xl" />
        </div>
    );
}

function ErroCentral({ erro, onContexto }: any) {
    return (
        <div className="bg-white border border-slate-200 p-20 rounded-2xl flex flex-col items-center text-center gap-10 max-w-2xl mx-auto shadow-md my-20">
            <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                <AlertTriangle size={44} strokeWidth={2} />
            </div>
            <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">Interrupção de Sinal</h3>
                <p className="text-slate-400 text-base font-medium leading-relaxed max-w-md mx-auto">{erro}</p>
            </div>
            <Botao variante="primario" className="px-16 py-6 bg-black text-white rounded-2xl hover:bg-slate-800 transition-all font-black uppercase tracking-[0.3em] text-[11px] shadow-md" onClick={onContexto}>Retomar Protocolo</Botao>
        </div>
    );
}

function VazioCentral() {
    return (
        <tr>
            <td colSpan={5} className="py-40 text-center">
                <div className="flex flex-col items-center gap-8 grayscale opacity-10">
                    <Search size={80} strokeWidth={1} className="text-slate-900" />
                    <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.6em]">Nenhuma Operação Encontrada</p>
                </div>
            </td>
        </tr>
    );
}
