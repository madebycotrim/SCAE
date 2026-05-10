import { useState, useEffect } from 'react';
import { 
    Search, Edit2, Ban, Plus, 
    ExternalLink, AlertTriangle, X, Zap,
    Trash2, Users, Shield, Activity, Layers, Check
} from 'lucide-react';
import { api } from '@/compartilhado/servicos/api';
import { toast } from 'react-hot-toast';
import { CardMetrica } from '@/compartilhado/componentes/UI';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

/**
 * Interface que define os dados de uma escola no sistema de gestão central.
 */
interface EscolaSistema {
    /** Identificador único UUID */
    id: string;
    /** Nome amigável da unidade */
    nome: string;
    /** Identificador URL (slug) */
    slug: string;
    /** Domínio de e-mail restrito para administração */
    dominioEmail: string;
    /** Quantidade atual de alunos cadastrados */
    totalAlunos: number;
    /** Limite máximo de alunos contratado */
    limiteAlunos: number;
    /** Limite máximo de terminais de quiosque */
    limiteTerminais: number;
    /** Informação de contato para suporte especializado */
    contatoSuporte: string;
    /** Status operacional da unidade */
    status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE';
    /** Provedor de autenticação SSO padrão */
    provedorAuth?: 'google' | 'microsoft';
    /** Data de criação da unidade (ISO 8601) */
    criadoEm: string;
}

/**
 * Página administrativa de Gestão Central para controle de múltiplas unidades escolares.
 * Permite gerenciar cotas, configurações de segurança e status operacional de cada escola.
 */
export function PaginaGestaoEscolas() {
    const [termoBusca, definirTermoBusca] = useState('');
    const [listaEscolas, definirListaEscolas] = useState<EscolaSistema[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [mensagemErro, definirMensagemErro] = useState<string | null>(null);

    // Controle de Modais e Fluxo de Dados
    const [modalAberto, definirModalAberto] = useState(false);
    const [processandoCriacao, definirProcessandoCriacao] = useState(false);
    const [idEscolaEmEdicao, definirIdEscolaEmEdicao] = useState<string | null>(null);
    
    /** Estrutura do formulário de unidade escolar */
    const FORMULARIO_PADRAO = {
        nome_escola: '',
        id: '',
        dominio_email: '',
        cor_primaria: '#0f172a',
        cor_secundaria: '#ffffff',
        logo_url: '',
        provedor_auth: 'google' as 'google' | 'microsoft',
        config_qr_dinamico: false,
        tts_ativado: true,
        saida_obrigatoria: true,
        metodo_acesso: 'QRCODE',
        limite_alunos: 1000,
        limite_terminais: 5,
        retencao_dados: 730,
        contato_suporte: ''
    };

    const [formUnidade, definirFormUnidade] = useState({ ...FORMULARIO_PADRAO });
    const [estadoConfirmacao, definirEstadoConfirmacao] = useState<{aberto: boolean, acao: () => void, titulo: string, mensagem: string, variante?: 'perigo' | 'padrao'} | null>(null);

    /**
     * Carrega a lista de todas as escolas do sistema via API central.
     */
    const carregarDadosEscolas = async () => {
        try {
            if (listaEscolas.length === 0) definirCarregando(true);
            const dadosSincronizados = await api.obter<EscolaSistema[]>('/central/escolas');
            definirListaEscolas(dadosSincronizados);
        } catch (erro: any) {
            console.error('[GestaoCentral] Erro ao carregar escolas:', erro);
            definirMensagemErro(erro.message || 'Falha na conexão com o servidor central.');
        } finally {
            definirCarregando(false);
        }
    };

    useEffect(() => {
        carregarDadosEscolas();
    }, []);

    /**
     * Busca dados detalhados e abre o modal de edição para uma escola.
     */
    const abrirEdicaoEscola = async (escola: EscolaSistema) => {
        try {
            const dadosCompletos = await api.obter<any>(`/central/escolas/${escola.id}`);
            definirFormUnidade({
                nome_escola: dadosCompletos.nome_escola || escola.nome,
                id: dadosCompletos.id || escola.slug,
                dominio_email: dadosCompletos.dominio_email || '',
                cor_primaria: dadosCompletos.cor_primaria || '#0f172a',
                cor_secundaria: dadosCompletos.cor_secundaria || '#ffffff',
                logo_url: dadosCompletos.logo_url || '',
                provedor_auth: dadosCompletos.provedor_auth || 'google',
                config_qr_dinamico: !!dadosCompletos.config_qr_dinamico,
                tts_ativado: dadosCompletos.tts_ativado !== 0,
                saida_obrigatoria: dadosCompletos.saida_obrigatoria !== 0,
                metodo_acesso: dadosCompletos.metodo_acesso || 'QRCODE',
                limite_alunos: dadosCompletos.limite_alunos || 1000,
                limite_terminais: dadosCompletos.limite_terminais || 5,
                retencao_dados: dadosCompletos.retencao_dados || 730,
                contato_suporte: dadosCompletos.contato_suporte || ''
            });
            definirIdEscolaEmEdicao(escola.id);
            definirModalAberto(true);
        } catch (erro: any) {
            toast.error('Falha ao recuperar as configurações completas da unidade.');
        }
    };

    /**
     * Alterna o status operacional entre ATIVA e SUSPENSA.
     */
    const alternarStatusUnidade = (escola: EscolaSistema) => {
        const novoStatusAlvo = escola.status === 'ATIVA' ? 'SUSPENSA' : 'ATIVA';
        definirEstadoConfirmacao({
            aberto: true,
            titulo: `${novoStatusAlvo === 'ATIVA' ? 'Reativar' : 'Suspender'} Unidade`,
            mensagem: `Deseja ${novoStatusAlvo === 'ATIVA' ? 'reativar' : 'suspender'} os serviços da escola ${escola.nome}?`,
            variante: novoStatusAlvo === 'SUSPENSA' ? 'perigo' : 'padrao',
            acao: async () => {
                try {
                    await api.atualizar(`/central/escolas/${escola.id}`, { status: novoStatusAlvo });
                    toast.success(`Unidade ${escola.nome} está agora ${novoStatusAlvo === 'ATIVA' ? 'ativa' : 'suspensa'}.`);
                    carregarDadosEscolas();
                } catch (erro: any) {
                    toast.error('Falha ao alterar o status da unidade.');
                }
            }
        });
    };

    /**
     * Remove permanentemente uma escola e todos os seus dados vinculados.
     */
    const lidarComExclusaoPermanente = async (id: string, nome: string) => {
        definirEstadoConfirmacao({
            aberto: true,
            titulo: 'Exclusão Permanente de Unidade',
            mensagem: `ATENÇÃO: Você está prestes a apagar permanentemente a escola — ${nome} — e TODOS os seus registros de alunos, acesso e logs. Esta ação não pode ser desfeita.`,
            variante: 'perigo',
            acao: async () => {
                try {
                    await api.remover(`/central/escolas/${id}`);
                    toast.success('Unidade e registros apagados com sucesso.');
                    carregarDadosEscolas();
                } catch (erro: any) {
                    toast.error(erro.mensagem || 'Falha ao processar exclusão.');
                }
            }
        });
    };

    /**
     * Processa a criação ou atualização de uma unidade no sistema central.
     */
    const lidarComSalvamento = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            definirProcessandoCriacao(true);
            if (idEscolaEmEdicao) {
                await api.atualizar(`/central/escolas/${idEscolaEmEdicao}`, formUnidade);
                toast.success('Diretrizes da unidade atualizadas.');
            } else {
                await api.enviar('/central/escolas', formUnidade);
                toast.success('Nova unidade organizacional cadastrada.');
            }
            definirModalAberto(false);
            definirIdEscolaEmEdicao(null);
            definirFormUnidade({ ...FORMULARIO_PADRAO });
            carregarDadosEscolas();
        } catch (erro: any) {
            toast.error(erro.message || 'Erro ao persistir dados da unidade.');
        } finally {
            definirProcessandoCriacao(false);
        }
    };

    const escolasFiltradas = listaEscolas.filter(escola =>
        escola.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
        escola.slug.toLowerCase().includes(termoBusca.toLowerCase())
    );

    if (carregando && listaEscolas.length === 0) {
        return (
            <div className="space-y-6 animate-pulse p-8">
                <div className="h-20 bg-slate-100 rounded-2xl" />
                <div className="h-64 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    if (mensagemErro) {
        return (
            <div className="p-16 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 border border-rose-100 shadow-sm">
                    <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase">Falha de Conectividade</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">{mensagemErro}</p>
                </div>
                <button 
                    onClick={carregarDadosEscolas} 
                    className="px-8 h-11 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                    Tentar Reinventar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestão Central</h1>
                    <p className="text-sm text-slate-500 font-medium">Controle de unidades, limites e diretrizes globais</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Procurar unidade..." 
                            value={termoBusca}
                            onChange={(e) => definirTermoBusca(e.target.value)}
                            className="pl-10 pr-4 h-11 w-64 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-slate-900 transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => { definirIdEscolaEmEdicao(null); definirFormUnidade({...FORMULARIO_PADRAO}); definirModalAberto(true); }}
                        className="flex items-center gap-2 px-6 h-11 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        <Plus size={16} strokeWidth={3} /> Nova Unidade
                    </button>
                </div>
            </header>
            
            {/* CARDS DE MÉTRICAS GLOBAIS (ESTILO LUXO PADRONIZADO 2XL) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CardMetrica
                    label="Total Unidades"
                    valor={listaEscolas.length}
                    icone={Layers}
                    variante="indigo"
                />
                <CardMetrica
                    label="Escolas Ativas"
                    valor={listaEscolas.filter(e => e.status === 'ATIVA').length}
                    icone={Shield}
                    variante="verde"
                />
                <CardMetrica
                    label="Alunos no Sistema"
                    valor={listaEscolas.reduce((acumulador, escola) => acumulador + (escola.totalAlunos || 0), 0)}
                    icone={Users}
                    variante="amarelo"
                />
                <CardMetrica
                    label="Cota Utilizada"
                    valor={`${Math.round((listaEscolas.reduce((acumulador, escola) => acumulador + (escola.totalAlunos || 0), 0) / (listaEscolas.reduce((acumulador, escola) => acumulador + (escola.limiteAlunos || 1000), 0) || 1)) * 100)}%`}
                    icone={Activity}
                    variante="rosa"
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Escola</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Domínio Adm</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden xl:table-cell">SSO Padrão</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alunos / Cota</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:table-cell">Quiosques</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {escolasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma unidade encontrada.</p>
                                </td>
                            </tr>
                        ) : (
                            escolasFiltradas.map((escola) => (
                                <tr key={escola.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-slate-800 uppercase tracking-tight leading-tight">{escola.nome}</p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{escola.slug}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-600 font-mono text-xs font-bold">{escola.dominioEmail}</span>
                                    </td>
                                    <td className="px-6 py-4 hidden xl:table-cell">
                                        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase font-black text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                            {escola.provedorAuth === 'microsoft' ? 'Microsoft 365' : 'Google WS'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[11px] font-black text-slate-700 min-w-[60px] tabular-nums">
                                                {escola.totalAlunos || 0} <span className="opacity-30">/</span> {escola.limiteAlunos || 1000}
                                            </span>
                                            <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                <div 
                                                    className="h-full bg-slate-400 transition-all duration-1000" 
                                                    style={{ width: `${Math.min(((escola.totalAlunos || 0) / (escola.limiteAlunos || 1000)) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden lg:table-cell">
                                         <span className="text-slate-600 text-[11px] font-bold uppercase">{escola.limiteTerminais || 5} unidades</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <BadgeStatus status={escola.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 text-slate-400">
                                            <a 
                                                href={`/${escola.slug}/admin/painel`}
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="w-8 h-8 flex items-center justify-center hover:text-slate-900 hover:bg-slate-100 transition-all rounded-xl"
                                                title="Acessar Unidade"
                                            >
                                                <ExternalLink size={15} />
                                            </a>
                                            <button 
                                                onClick={() => abrirEdicaoEscola(escola)}
                                                className="w-8 h-8 flex items-center justify-center hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                                                title="Editar Diretrizes"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button 
                                                onClick={() => alternarStatusUnidade(escola)}
                                                className={`w-8 h-8 flex items-center justify-center transition-all rounded-xl ${escola.status === 'ATIVA' ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                title={escola.status === 'ATIVA' ? 'Suspender Operação' : 'Reativar Unidade'}
                                            >
                                                {escola.status === 'ATIVA' ? <Ban size={15} /> : <Zap size={15} />}
                                            </button>
                                            <button 
                                                onClick={() => lidarComExclusaoPermanente(escola.id, escola.nome)}
                                                className="w-8 h-8 flex items-center justify-center hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                                                title="Apagar permanentemente"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-500">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    {idEscolaEmEdicao ? 'Editar Unidade Organizacional' : 'Cadastrar Nova Unidade'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">Controle de limites e diretrizes da rede Catraki.</p>
                            </div>
                            <button onClick={() => definirModalAberto(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all rounded-2xl">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form id="form-escola-central" onSubmit={lidarComSalvamento} className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
                            
                            {/* Sessão 1: Identidade */}
                            <section className="space-y-6">
                                <div className="border-b border-slate-100 pb-3">
                                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">1. Identidade e Acesso</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Oficial da Escola</label>
                                        <input required type="text" placeholder="Ex: CEM 01 de Brasília" value={formUnidade.nome_escola}
                                            onChange={(e) => definirFormUnidade({...formUnidade, nome_escola: e.target.value})}
                                            className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID Único (Slug)</label>
                                        <input required type="text" placeholder="ex: cem-01" value={formUnidade.id}
                                            onChange={(e) => definirFormUnidade({...formUnidade, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                                            className="w-full h-11 px-4 text-sm font-black font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 ml-1 uppercase opacity-60">URL: <span className="text-indigo-500">/{formUnidade.id || 'slug'}</span></p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Domínio Restrito (Admin)</label>
                                        <input required type="text" placeholder="Ex: @edu.se.df.gov.br" value={formUnidade.dominio_email}
                                            onChange={(e) => definirFormUnidade({...formUnidade, dominio_email: e.target.value})}
                                            className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Provedor SSO Padrão</label>
                                        <select value={formUnidade.provedor_auth}
                                            onChange={(e) => definirFormUnidade({...formUnidade, provedor_auth: e.target.value as 'google' | 'microsoft'})}
                                            className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all cursor-pointer"
                                        >
                                            <option value="google">Google Workspace (Padrão)</option>
                                            <option value="microsoft">Microsoft Entra ID (O365)</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Sessão 2: Aparência */}
                            <section className="space-y-6">
                                <div className="border-b border-slate-100 pb-3">
                                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">2. Estética e Branding</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cor Primária</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" value={formUnidade.cor_primaria}
                                                onChange={(e) => definirFormUnidade({...formUnidade, cor_primaria: e.target.value})}
                                                className="w-12 h-11 rounded-xl border-0 p-1 bg-slate-50 cursor-pointer overflow-hidden"
                                            />
                                            <input type="text" value={formUnidade.cor_primaria}
                                                onChange={(e) => definirFormUnidade({...formUnidade, cor_primaria: e.target.value})}
                                                className="w-full h-11 px-3 text-xs font-black font-mono border border-slate-200 rounded-xl uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cor Secundária</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" value={formUnidade.cor_secundaria}
                                                onChange={(e) => definirFormUnidade({...formUnidade, cor_secundaria: e.target.value})}
                                                className="w-12 h-11 rounded-xl border-0 p-1 bg-slate-50 cursor-pointer overflow-hidden shadow-sm"
                                            />
                                            <input type="text" value={formUnidade.cor_secundaria}
                                                onChange={(e) => definirFormUnidade({...formUnidade, cor_secundaria: e.target.value})}
                                                className="w-full h-11 px-3 text-xs font-black font-mono border border-slate-200 rounded-xl uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Brasão (URL)</label>
                                        <input type="url" value={formUnidade.logo_url} placeholder="https://..."
                                            onChange={(e) => definirFormUnidade({...formUnidade, logo_url: e.target.value})}
                                            className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Sessão 3: Capacidade e Configuração */}
                            <section className="space-y-6">
                                <div className="border-b border-slate-100 pb-3">
                                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">3. Limites e Auditoria (LGPD)</h4>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Máx. Alunos</label>
                                        <input type="number" value={formUnidade.limite_alunos}
                                            onChange={(e) => definirFormUnidade({...formUnidade, limite_alunos: parseInt(e.target.value) || 0})}
                                            className="w-full h-11 px-4 text-sm font-black bg-slate-50 border border-slate-200 rounded-2xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Terminais Ativos</label>
                                        <input type="number" value={formUnidade.limite_terminais}
                                            onChange={(e) => definirFormUnidade({...formUnidade, limite_terminais: parseInt(e.target.value) || 0})}
                                            className="w-full h-11 px-4 text-sm font-black bg-slate-50 border border-slate-200 rounded-2xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Retenção de Logs</label>
                                        <select value={formUnidade.retencao_dados}
                                            onChange={(e) => definirFormUnidade({...formUnidade, retencao_dados: parseInt(e.target.value)})}
                                            className="w-full h-11 px-4 text-sm font-bold bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer"
                                        >
                                            <option value={180}>180 Dias</option>
                                            <option value={365}>1 Ano Letivo</option>
                                            <option value={730}>2 Anos (Recomendado)</option>
                                            <option value={1825}>5 Anos (Máximo)</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* Sessão 4: Regras de Negócio */}
                            <section className="space-y-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                                <div className="border-b border-slate-200/60 pb-3">
                                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight">4. Diretrizes e Métodos de Identificação</h4>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1">Configurações globais que regem o comportamento da portaria.</p>
                                </div>
                                
                                <div className="space-y-5">
                                    <div className="flex flex-wrap gap-4">
                                        {['QRCODE', 'DIGITAL'].map(metodo => {
                                            const metodosAtivos = formUnidade.metodo_acesso.split(',').filter(Boolean);
                                            const estaAtivo = metodosAtivos.includes(metodo);
                                            return (
                                                <button 
                                                    key={metodo}
                                                    type="button"
                                                    onClick={() => {
                                                        const novos = estaAtivo ? metodosAtivos.filter(m => m !== metodo) : [...metodosAtivos, metodo];
                                                        if(novos.length === 0) return;
                                                        definirFormUnidade({...formUnidade, metodo_acesso: novos.join(',')});
                                                    }}
                                                    className={`px-6 h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                        estaAtivo 
                                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' 
                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {metodo === 'QRCODE' ? 'QR Code Criptografado' : 'Biometria Digital'}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* CARD TTS */}
                                        <div 
                                            className={`relative p-5 rounded-[24px] border transition-all cursor-pointer shadow-sm group ${formUnidade.tts_ativado ? 'bg-white border-blue-500 ring-4 ring-blue-500/5' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                            onClick={() => definirFormUnidade({...formUnidade, tts_ativado: !formUnidade.tts_ativado})}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${formUnidade.tts_ativado ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                                                    <Zap size={20} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className={`text-[11px] font-black uppercase tracking-tight ${formUnidade.tts_ativado ? 'text-slate-900' : 'text-slate-500'}`}>Leitura TTS</h3>
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formUnidade.tts_ativado ? 'bg-blue-500 border-blue-500' : 'border-slate-200'}`}>
                                                            {formUnidade.tts_ativado && <Check size={8} className="text-white" strokeWidth={5} />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold leading-tight">Narração vocal de boas-vindas na batida.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CARD SAÍDA */}
                                        <div 
                                            className={`relative p-5 rounded-[24px] border transition-all cursor-pointer shadow-sm group ${formUnidade.saida_obrigatoria ? 'bg-white border-rose-500 ring-4 ring-rose-500/5' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                            onClick={() => definirFormUnidade({...formUnidade, saida_obrigatoria: !formUnidade.saida_obrigatoria})}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${formUnidade.saida_obrigatoria ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                                                    <Activity size={20} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className={`text-[11px] font-black uppercase tracking-tight ${formUnidade.saida_obrigatoria ? 'text-slate-900' : 'text-slate-500'}`}>Validar Saída</h3>
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formUnidade.saida_obrigatoria ? 'bg-rose-500 border-rose-500' : 'border-slate-200'}`}>
                                                            {formUnidade.saida_obrigatoria && <Check size={8} className="text-white" strokeWidth={5} />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold leading-tight">Exigir batida na saída para métricas precisas.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CARD QR DINAMICO */}
                                        {formUnidade.metodo_acesso.includes('QRCODE') && (
                                            <div 
                                                className={`relative p-5 rounded-[24px] border transition-all cursor-pointer shadow-sm group sm:col-span-2 ${formUnidade.config_qr_dinamico ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/5' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                                onClick={() => definirFormUnidade({...formUnidade, config_qr_dinamico: !formUnidade.config_qr_dinamico})}
                                            >
                                                <div className="flex gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${formUnidade.config_qr_dinamico ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                                                        <Shield size={20} />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className={`text-[11px] font-black uppercase tracking-tight ${formUnidade.config_qr_dinamico ? 'text-slate-900' : 'text-slate-500'}`}>Segurança Híbrida (QR Dinâmico)</h3>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formUnidade.config_qr_dinamico ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                                                                {formUnidade.config_qr_dinamico && <Check size={8} className="text-white" strokeWidth={5} />}
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-sm">
                                                            OTP mutável exclusivo da unidade — Impede logs ou prints clonados.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                        </form>

                        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0">
                            <button 
                                type="button" 
                                onClick={() => definirModalAberto(false)}
                                className="px-6 h-11 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                form="form-escola-central"
                                disabled={processandoCriacao}
                                className="px-10 h-11 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                            >
                                {processandoCriacao ? 'Persistindo...' : idEscolaEmEdicao ? 'Atualizar Diretrizes' : 'Finalizar Cadastro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {estadoConfirmacao?.aberto && (
                <ModalConfirmacao
                    titulo={estadoConfirmacao.titulo}
                    mensagem={estadoConfirmacao.mensagem}
                    aoConfirmar={() => {
                        estadoConfirmacao.acao();
                        definirEstadoConfirmacao(null);
                    }}
                    aoCancelar={() => definirEstadoConfirmacao(null)}
                    variante={estadoConfirmacao.variante}
                />
            )}
        </div>
    );
}

/**
 * Componente de Badge para exibição do status operacional da unidade.
 */
function BadgeStatus({ status }: { status: 'ATIVA' | 'SUSPENSA' | 'PENDENTE' }) {
    if (status === 'ATIVA') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operacional
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Suspenso
        </span>
    );
}
