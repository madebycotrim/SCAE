import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { 
    Users, Activity, Signal, AlertTriangle, 
    ArrowUp, XCircle, Clock, RefreshCw,
    Shield, CheckCircle2, Search, Fingerprint, Trash2,
    Settings, Save, X, User, ShieldCheck, Plus, SearchCheck, ArrowRightCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { alunoServico } from '@/funcionalidades/academico/servicos/aluno.servico';
import toast from 'react-hot-toast';

interface StatusAgente {
    ok: boolean;
    agente: string;
    versao: string;
    escola: string;
    status: string;
    stats: {
        entradas: number;
        saidas: number;
        negados: number;
        ultimoAcesso: string | null;
        ultimosEventos: Array<{
            nome: string;
            tipo: string;
            timestamp: string;
        }>;
    };
    leitores: Array<{
        id: string;
        nome: string;
        tipo: string;
        online: boolean;
        ip?: string;
        porta?: string;
    }>;
}

export default function PaginaAgente() {
    const escola = usarEscola();
    const slugEscola = escola.id;
    const [status, setStatus] = useState<StatusAgente | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    // Estado para Busca de Alunos
    const [termoBusca, setTermoBusca] = useState('');
    const [cadastrandoPara, setCadastrandoPara] = useState<string | null>(null);
    // Estado para "enganar" o cache até o servidor atualizar (Melhoria de Cache UI)
    const [biometriasConfirmadas, setBiometriasConfirmadas] = useState<Set<string>>(new Set());

    // --- ESTADOS DE CONFIGURAÇÃO DE VOZ ---
    const [ttsAtivado, setTtsAtivado] = useState(escola?.ttsAtivado || false);
    const [ttsFraseSucesso, setTtsFraseSucesso] = useState(escola?.ttsFraseSucesso || 'Bem-vindo, {nome}!');
    const [ttsFraseErro, setTtsFraseErro] = useState(escola?.ttsFraseErro || 'Acesso negado.');
    const [salvandoConfig, setSalvandoConfig] = useState(false);

    /**
     * Salva as preferências de voz no servidor (D1 + KV)
     */
    const salvarPreferenciasVoz = async () => {
        setSalvandoConfig(true);
        const toastId = toast.loading('Gravando configurações na nuvem...');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            // ⚡ PATCH /api/central/escolas/[id]
            const res = await fetch(`${apiUrl}/central/escolas/${escola.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tts_ativado: ttsAtivado,
                    config_tts_frase_sucesso: ttsFraseSucesso,
                    config_tts_frase_erro: ttsFraseErro
                })
            });

            if (!res.ok) throw new Error('Falha ao salvar no servidor central');

            toast.success('Configurações salvas!', { id: toastId });

            // ⚡ Avisa o Agente Local para sincronizar AGORA (Force Sync)
            try {
                await fetch('http://127.0.0.1:1912/sync-now', { method: 'POST' });
            } catch { /* Agente local offline */ }

        } catch (e) {
            toast.error('Erro ao salvar no servidor.', { id: toastId });
        } finally {
            setSalvandoConfig(false);
        }
    };

    const { dados: dataAlunos, recarregar: atualizarAlunos } = usarConsulta(
        ['alunos-agente-busca', slugEscola],
        () => alunoServico.carregarOnline(),
        { enabled: !!slugEscola }
    );

    // ⚡ Normalização de Cache: Une os dados do servidor com os confirmados nesta sessão
    const alunos = (dataAlunos?.alunos || []).map(a => ({
        ...a,
        biometria_cadastrada: biometriasConfirmadas.has(a.matricula) ? 1 : a.biometria_cadastrada
    }));

    const alunosFiltrados = termoBusca.length >= 2 
        ? alunos.filter(a => 
            a.nome_completo.toLowerCase().includes(termoBusca.toLowerCase()) || 
            a.matricula.includes(termoBusca)
          ).slice(0, 5)
        : [];

    const verificarAgente = async () => {
        try {
            const res = await fetch('http://127.0.0.1:1912/ping');
            if (!res.ok) throw new Error();
            const dados = await res.json();
            setStatus(dados);
            setErro(null);
        } catch (e) {
            setStatus(null);
            setErro('AGENTE LOCAL DESCONECTADO');
        } finally {
            setCarregando(false);
        }
    };



    /**
     * Solicita ao agente local que inicie a captura biométrica
     */
    const iniciarCadastroBiometrico = async (matricula: string, nome: string) => {
        if (!status?.ok) {
            toast.error('Agente offline. Certifique-se que o app Catraki está aberto.');
            return;
        }

        setCadastrandoPara(matricula);
        const toastId = toast.loading(`Aguardando digital de ${nome.split(' ')[0]} no leitor...`, { 
            style: { border: '2px solid #6366f1', fontWeight: 'bold' }
        });

        try {
            const res = await fetch('http://127.0.0.1:1912/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id: matricula })
            });

            const data = await res.json();
            if (data.ok) {
                toast.success('Digital vinculada com sucesso!', { id: toastId });
                
                // ⚡ MELHORIA DE CACHE UI: Marca como confirmado nesta sessão
                setBiometriasConfirmadas(prev => new Set(prev).add(matricula));

                // Revalida os dados reais do servidor em background
                setTimeout(atualizarAlunos, 2000);
            } else {
                toast.error(data.mensagem || 'Falha na captura.', { id: toastId });
            }
        } catch (e) {
            toast.error('Erro de conexão local.', { id: toastId });
        } finally {
            setCadastrandoPara(null);
        }
    };

    useEffect(() => {
        verificarAgente();
        const interval = setInterval(verificarAgente, 5000); // Polling rápido para dashboard
        return () => clearInterval(interval);
    }, []);

    return (
        <LayoutAdministrativo
            titulo="Gestão de Biometria"
            subtitulo="Controle de acesso e cadastro de digitais em tempo real"
        >
            <div className="space-y-6">
                {/* 1. MÉTRICAS DE FLUXO (CABEÇALHO) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <ArrowUp size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{status?.stats?.entradas || 0}</h4>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <XCircle size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negados</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{status?.stats?.negados || 0}</h4>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pico</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">--:--</h4>
                            </div>
                        </div>
                    </CartaoConteudo>

                    <CartaoConteudo className="relative p-5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último</p>
                                <h4 className="text-2xl font-black text-slate-800 leading-none">{status?.stats?.ultimoAcesso || '--:--'}</h4>
                            </div>
                        </div>
                    </CartaoConteudo>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. ÁREA DE CADASTRO (PRINCIPAL) */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 text-center md:text-left">Pesquisar Aluno para Cadastro</h4>
                        <CartaoConteudo className="p-6 border-slate-200">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="text"
                                    placeholder="Pesquise o Aluno pelo nome ou matrícula..."
                                    value={termoBusca}
                                    onChange={(e) => setTermoBusca(e.target.value)}
                                    className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all outline-none placeholder:text-slate-300"
                                />
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence mode="wait">
                                    {alunosFiltrados.length > 0 ? (
                                        alunosFiltrados.map((aluno) => (
                                            <motion.div
                                                key={aluno.matricula}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-200 hover:shadow-media-suave transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${aluno.biometria_cadastrada ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                                        {aluno.biometria_cadastrada ? <CheckCircle2 size={24} /> : <User size={24} />}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
                                                            {aluno.nome_completo}
                                                        </h5>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aluno.matricula}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                            {aluno.biometria_cadastrada ? (
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                                                    <Shield size={10} strokeWidth={3} />
                                                                    Digital já cadastrada
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{aluno.turma_id || 'SEM TURMA'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Botao 
                                                    variante={aluno.biometria_cadastrada ? 'secundario' : 'primario'}
                                                    tamanho="md"
                                                    onClick={() => iniciarCadastroBiometrico(aluno.matricula, aluno.nome_completo)}
                                                    carregando={cadastrandoPara === aluno.matricula}
                                                    disabled={!status?.ok}
                                                    icone={Fingerprint}
                                                >
                                                    {aluno.biometria_cadastrada ? 'Recadastrar' : 'Cadastrar Digital'}
                                                </Botao>
                                            </motion.div>
                                        ))
                                    ) : termoBusca.length >= 2 ? (
                                        <div className="py-12 text-center">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum aluno encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                            <Fingerprint size={48} className="mx-auto mb-4 text-slate-200" strokeWidth={1} />
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Processo de Cadastro</h5>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Passe o mouse ou toque para selecionar um aluno</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* 3. COLUNA DIREITA (OPERACIONAL) */}
                    <div className="space-y-6">
                        {/* EQUIPAMENTOS */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Hardware Conectado</h4>
                            <div className="grid gap-3">
                                {status?.leitores && status.leitores.length > 0 ? status.leitores.map((leitor: any) => (
                                    <CartaoConteudo key={leitor.id} className="relative p-4 overflow-hidden border-slate-100 shadow-sm">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${leitor.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${leitor.online ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
                                                <div>
                                                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{leitor.nome}</h5>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                        <span>{leitor.tipo}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-indigo-500/60 font-black">Gerenciado Localmente</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${leitor.online ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {leitor.online ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    </CartaoConteudo>
                                )) : (
                                    <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nenhum equipamento detectado</p>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* MINI FEED DE ACESSOS */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 flex items-center justify-between">
                                Fluxo Recente
                                <Activity size={12} className="text-indigo-400 animate-pulse" />
                            </h4>
                            <div className="space-y-2">
                                <AnimatePresence mode="popLayout">
                                    {(status?.stats?.ultimosEventos || []).map((ev: any, idx: number) => {
                                        const alunoInfo = alunos.find(a => {
                                            const m1 = String(a.matricula || '').replace(/^0+/, '');
                                            const m2 = String(ev.matricula || '').replace(/^0+/, '');
                                            return (m1 === m2 && m1 !== '') || (a.matricula === ev.matricula);
                                        });

                                        const nomeExibicao = alunoInfo?.nome_completo || ev.nome || 'ALUNO IDENTIFICADO';
                                        
                                        // Formatação de hora segura (Trata ISO novo e HH:mm legado)
                                        let horaFormatada = ev.timestamp;
                                        const dataObjeto = new Date(ev.timestamp);
                                        if (!isNaN(dataObjeto.getTime()) && String(ev.timestamp).includes('T')) {
                                            const fuso = new Intl.DateTimeFormat('pt-BR', {
                                                timeZone: 'America/Sao_Paulo',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });
                                            horaFormatada = fuso.format(dataObjeto);
                                        }

                                        return (
                                            <motion.div
                                                key={`${ev.timestamp}-${idx}`}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ev.tipo === 'NEGADO' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                        {ev.tipo === 'NEGADO' ? <XCircle size={14} /> : <ArrowRightCircle size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                                                                {nomeExibicao}
                                                            </p>
                                                            {!!alunoInfo?.biometria_cadastrada && (
                                                                <div className="bg-emerald-100 text-emerald-600 text-[7px] px-1 rounded-sm font-black uppercase tracking-widest flex items-center gap-0.5">
                                                                    <ShieldCheck size={8} /> OK
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            {alunoInfo?.matricula || ev.matricula || '---'} • {alunoInfo?.turma_id || '---'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black text-indigo-500 font-mono bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                                        {horaFormatada}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {(!status?.stats?.ultimosEventos || status.stats.ultimosEventos.length === 0) && (
                                        <div className="py-8 text-center opacity-30">
                                            <Clock size={24} className="mx-auto mb-2" />
                                            <p className="text-[9px] font-bold uppercase tracking-widest">Aguardando acessos...</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* CONFIGURAÇÕES DE VOZ (NOVO QUADRO) */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 flex items-center gap-2">
                                <Settings size={12} className="text-slate-400" />
                                Saudação por Voz (TTS)
                            </h4>
                            <CartaoConteudo className="p-5 border-slate-200">
                                <div className="space-y-5">
                                    {/* Toggle Geral */}
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Voz do Sistema</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ativar anúncios por voz no hardware</p>
                                        </div>
                                        <button 
                                            onClick={() => setTtsAtivado(!ttsAtivado)}
                                            className={`w-12 h-6 rounded-full transition-all relative ${ttsAtivado ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${ttsAtivado ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    {/* Inputs de Texto */}
                                    <AnimatePresence>
                                        {ttsAtivado && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="space-y-3 overflow-hidden"
                                            >
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Frase de Sucesso</label>
                                                    <input 
                                                        type="text"
                                                        value={ttsFraseSucesso}
                                                        onChange={(e) => setTtsFraseSucesso(e.target.value)}
                                                        placeholder="Ex: Bem-vindo, {nome}!"
                                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Frase de Erro</label>
                                                    <input 
                                                        type="text"
                                                        value={ttsFraseErro}
                                                        onChange={(e) => setTtsFraseErro(e.target.value)}
                                                        placeholder="Ex: Acesso Negado."
                                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                                <div className="p-2 bg-indigo-50 rounded-lg">
                                                    <p className="text-[8px] font-bold text-indigo-500 leading-relaxed uppercase">
                                                        <span className="font-black">Dica:</span> Use <span className="text-indigo-800 bg-white px-1 rounded">{`{nome}`}</span> para no local do nome do aluno.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Botao 
                                        onClick={salvarPreferenciasVoz}
                                        carregando={salvandoConfig}
                                        variante="primario" 
                                        icone={Save}
                                        className="w-full"
                                    >
                                        Salvar Configurações
                                    </Botao>
                                </div>
                            </CartaoConteudo>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
