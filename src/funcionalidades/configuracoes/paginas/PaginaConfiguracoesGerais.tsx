import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao } from '@/compartilhado/componentes/UI';
import { 
    ShieldAlert, 
    Wifi, 
    Volume2, 
    VolumeX, 
    Loader2, 
    DoorOpen, 
    DoorClosed, 
    Fingerprint, 
    Smartphone, 
    Cpu, 
    CheckCircle2, 
    AlertCircle, 
    Power, 
    RefreshCw, 
    Download 
} from 'lucide-react';
import { usarConfiguracoesEscola } from '@/compartilhado/hooks/usarConfiguracoesEscola';
import { api } from '@/compartilhado/servicos/api';
import toast from 'react-hot-toast';
import { usarAgente } from '@/compartilhado/contextos/ContextoAgente';
import { agenteServico } from '@/compartilhado/servicos/agente.servico';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Painel administrativo de configurações globais do ecossistema SCAE.
 * Gerencia preferências de acesso, notificações por voz e telemetria do Agente Local.
 */
export function PaginaConfiguracoesGerais() {
    const { configs, salvar, salvando, isLoading } = usarConfiguracoesEscola();
    const { online: agenteOnline, agente: infoAgente, forcarVerificacao } = usarAgente();

    // --- ESTADO TÉCNICO ---
    const [qrDinamico, definirQrDinamico] = useState<boolean>(false);
    const [vozAtivada, definirVozAtivada] = useState<boolean>(false);
    const [saidaObrigatoria, definirSaidaObrigatoria] = useState<boolean>(true);
    const [metodoAcesso, definirMetodoAcesso] = useState<'QRCODE' | 'DIGITAL'>('QRCODE');
    const [fraseSucesso, definirFraseSucesso] = useState<string>('');
    const [fraseErro, definirFraseErro] = useState<string>('');
    
    // --- ESTADO DE UI ---
    const [enviandoComando, definirEnviandoComando] = useState(false);

    /**
     * Envia uma ordem administrativa para o servidor enfileirar para o Agente.
     * @param acao - Nome da ação (ex: REBOOT_AGENT).
     * @param parametros - Dados adicionais para o comando.
     */
    const enviarComandoAdministrativo = async (acao: string, parametros: any = {}) => {
        const idToast = toast.loading('Propagando ordem via nuvem...');
        definirEnviandoComando(true);
        try {
            await api.enviar('/agente/comandos', { acao, params: parametros });
            toast.success('Ordem enfileirada! O Agente executará em segundos.', { id: idToast });
        } catch (erro: any) {
            toast.error(`Falha na propagação: ${erro.message}`, { id: idToast });
        } finally {
            definirEnviandoComando(false);
        }
    };

    /**
     * Força o Agente local a realizar uma sincronização de dados imediata.
     */
    const forcarSincronizacaoLocal = async () => {
        try {
            await agenteServico.forcarSincronia();
            toast.success('Sincronização local disparada com sucesso!');
            forcarVerificacao();
        } catch {
            toast.error('Falha na comunicação direta. Verifique se o Agente está aberto.');
        }
    };

    // Sincronização inicial de dados do servidor para o estado local do formulário
    useEffect(() => {
        if (configs) {
            definirQrDinamico(configs.qrDinamico || false);
            definirVozAtivada(configs.ttsAtivado ?? true);
            definirSaidaObrigatoria(configs.saidaObrigatoria ?? true);
            definirMetodoAcesso(configs.metodoAcesso || 'QRCODE');
            definirFraseSucesso(configs.ttsFraseSucesso ?? '');
            definirFraseErro(configs.ttsFraseErro ?? '');
        }
    }, [configs]);

    /**
     * Persiste as alterações de configuração no banco de dados da escola.
     */
    const salvarAlteracoes = async () => {
        try {
            await salvar({
                qrDinamico,
                ttsAtivado: vozAtivada,
                ttsFraseSucesso: fraseSucesso,
                ttsFraseErro: fraseErro,
                saidaObrigatoria,
                metodoAcesso
            });
            toast.success('Configurações aplicadas globalmente!');
        } catch (erro) {
            toast.error('Não foi possível salvar as preferências.');
        }
    };

    if (isLoading) {
        return (
            <LayoutAdministrativo titulo="Configurações">
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <Loader2 className="w-12 h-12 animate-spin text-eletrico" />
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">Calibrando Interface...</span>
                </div>
            </LayoutAdministrativo>
        );
    }

    const houveAlteração = configs?.qrDinamico !== qrDinamico || 
                          configs?.ttsAtivado !== vozAtivada || 
                          configs?.ttsFraseSucesso !== fraseSucesso || 
                          configs?.ttsFraseErro !== fraseErro || 
                          configs?.saidaObrigatoria !== saidaObrigatoria || 
                          (configs?.metodoAcesso || 'QRCODE') !== metodoAcesso;

    return (
        <LayoutAdministrativo
            titulo="Configurações"
            subtitulo="Personalize o comportamento e a segurança do sistema para esta unidade"
            acoes={
                houveAlteração ? (
                    <Botao variante="primario" tamanho="lg" onClick={salvarAlteracoes} carregando={salvando} className="rounded-2xl shadow-2xl">
                        Aplicar Configurações
                    </Botao>
                ) : (
                    <div className="px-6 py-3 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl border border-blue-400 shadow-xl flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Ambiente Sincronizado
                    </div>
                )
            }
        >
            <div className="space-y-12 max-w-5xl mx-auto pb-32">
                
                {/* 🔒 SEÇÃO: FLUXO DE ACESSO */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 ml-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Arquitetura de Reconhecimento</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* MÉTODO DE IDENTIFICAÇÃO */}
                        <motion.div 
                            whileHover={{ y: -4 }}
                            className="bg-white/40 backdrop-blur-3xl border border-slate-200/60 rounded-[2.5rem] p-8 flex flex-col justify-between gap-8 shadow-xl"
                        >
                            <div className="flex gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${metodoAcesso === 'QRCODE' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                    {metodoAcesso === 'QRCODE' ? <Smartphone size={28} /> : <Fingerprint size={28} />}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Médium de Acesso</h3>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest opacity-60">Define como os discentes serão identificados no terminal de entrada.</p>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-3xl grid grid-cols-2 gap-2 border border-slate-200/50">
                                <button onClick={() => definirMetodoAcesso('QRCODE')} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${metodoAcesso === 'QRCODE' ? 'bg-blue-500 text-white shadow-2xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                                    QR Code / Cartão
                                </button>
                                <button onClick={() => definirMetodoAcesso('DIGITAL')} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${metodoAcesso === 'DIGITAL' ? 'bg-white text-emerald-600 shadow-xl border border-slate-100 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Biometria Digital
                                </button>
                            </div>
                        </motion.div>

                        {/* CONTROLE DE SAÍDA */}
                        <motion.div 
                            whileHover={{ y: -4 }}
                            className="bg-white/40 backdrop-blur-3xl border border-slate-200/60 rounded-[2.5rem] p-8 flex flex-col justify-between gap-8 shadow-xl"
                        >
                            <div className="flex gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${saidaObrigatoria ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                                    {saidaObrigatoria ? <DoorClosed size={28} /> : <DoorOpen size={28} />}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Protocolo de Saída</h3>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest opacity-60">Determina se o registro de saída é compulsório para baixa no sistema.</p>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-3xl grid grid-cols-2 gap-2 border border-slate-200/50">
                                <button onClick={() => definirSaidaObrigatoria(false)} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!saidaObrigatoria ? 'bg-white text-amber-600 shadow-xl border border-slate-100 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Livre Trânsito
                                </button>
                                <button onClick={() => definirSaidaObrigatoria(true)} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${saidaObrigatoria ? 'bg-blue-500 text-white shadow-2xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Baixa Obrigatória
                                </button>
                            </div>
                        </motion.div>

                        {/* PROTOCOLO DINÂMICO */}
                        {metodoAcesso === 'QRCODE' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-10 shadow-sm"
                            >
                                <div className="flex gap-8 items-start">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${qrDinamico ? 'bg-indigo-600 text-white ring-8 ring-indigo-50' : 'bg-slate-100 text-slate-400'}`}>
                                        <ShieldAlert size={32} />
                                    </div>
                                    <div className="space-y-3 pt-1">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Criptografia Dinâmica</h3>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${qrDinamico ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                {qrDinamico ? 'Anti-Fraude Ativo' : 'Protocolo Estático'}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 font-medium max-w-xl leading-relaxed uppercase tracking-wider opacity-80">
                                            {qrDinamico 
                                                ? "O código de acesso expira a cada 15 segundos. Impede impressões e capturas de tela fraudulentas." 
                                                : "O ID do aluno é fixo. Permite o uso de cartões físicos impressos permanentemente."}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-2xl flex h-14 w-full md:w-[320px] shrink-0 border border-slate-100">
                                    <button onClick={() => definirQrDinamico(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!qrDinamico ? 'bg-white text-blue-500 shadow-xl scale-[1.05]' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Estático
                                    </button>
                                    <button onClick={() => definirQrDinamico(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${qrDinamico ? 'bg-blue-500 text-white shadow-2xl scale-[1.05]' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Dinâmico
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* 🔊 SEÇÃO: VOZ E ANÚNCIOS */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 ml-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Interface de Voz (TTS)</h2>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-pink-200 transition-all">
                        <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="flex gap-8 items-start">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${vozAtivada ? 'bg-pink-500 text-white ring-8 ring-pink-50' : 'bg-slate-100 text-slate-400'}`}>
                                    {vozAtivada ? <Volume2 size={32} /> : <VolumeX size={32} />}
                                </div>
                                <div className="space-y-3 pt-1">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Síntese de Voz Operacional</h3>
                                    <p className="text-[12px] text-slate-500 font-medium max-w-xl leading-relaxed uppercase tracking-wider opacity-80">O terminal narra o status do acesso em tempo real, humanizando a interação.</p>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-3xl flex h-14 w-full md:w-[320px] shrink-0 border border-slate-200/50">
                                <button onClick={() => definirVozAtivada(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!vozAtivada ? 'bg-white text-blue-500 shadow-xl scale-[1.05]' : 'text-slate-400 hover:text-slate-500'}`}>
                                    Silencioso
                                </button>
                                <button onClick={() => definirVozAtivada(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${vozAtivada ? 'bg-pink-600 text-white shadow-2xl scale-[1.05]' : 'text-slate-400 hover:text-slate-500'}`}>
                                    Interativo
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {vozAtivada && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-10 pb-12 overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm"><CheckCircle2 size={16} /></div>
                                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Saudação de Sucesso</h4>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={fraseSucesso} 
                                                onChange={(e) => definirFraseSucesso(e.target.value)} 
                                                placeholder="BEM-VINDO AO CATRAKI, {NOME}!" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 h-16 text-sm font-black text-slate-900 placeholder:text-slate-200 focus:bg-white outline-none transition-all uppercase tracking-tight" 
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shadow-sm"><AlertCircle size={16} /></div>
                                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Alerta de Restrição</h4>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={fraseErro} 
                                                onChange={(e) => definirFraseErro(e.target.value)} 
                                                placeholder="ACESSO NEGADO. PROCURE A SECRETARIA." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 h-16 text-sm font-black text-slate-900 placeholder:text-slate-200 focus:bg-white outline-none transition-all uppercase tracking-tight" 
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-8 p-6 bg-blue-600 border border-blue-500 rounded-2xl flex items-center gap-5 shadow-lg">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
                                            <Smartphone size={20} />
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                                            Variável dinâminca: Use <code className="text-white font-black mx-1">{"{nome}"}</code> para inserir o prenome do discente na fala.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* ⚙️ SEÇÃO: TELEMETRIA DO AGENTE */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Terminal Operacional (Catraki Edge)</h2>
                        </div>
                        {agenteOnline && (
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                Link Ativo
                            </span>
                        )}
                    </div>

                    <div className="bg-blue-900 rounded-2xl p-10 md:p-14 shadow-xl border border-blue-800 relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 4px)', backgroundSize: '100% 4px' }} />

                        <div className="flex flex-col lg:flex-row items-center justify-between gap-14 relative z-10">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                                <div className="relative">
                                    <div className={`w-28 h-28 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-xl ${
                                        agenteOnline 
                                            ? 'bg-blue-500 text-white shadow-blue-500/40' 
                                            : 'bg-blue-600 text-slate-400 border border-blue-500'
                                    }`}>
                                        <Cpu size={56} className={agenteOnline ? 'animate-pulse' : ''} />
                                    </div>
                                    {agenteOnline && (
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-slate-950 animate-bounce">
                                            <Wifi size={14} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <h3 className="text-2xl font-black text-white tracking-tight uppercase italic underline decoration-indigo-500 decoration-4 underline-offset-8">Catraki Edge Agent</h3>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
                                            agenteOnline 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-slate-900 text-slate-500 border-slate-800'
                                        }`}>
                                            {agenteOnline ? 'Telemetria em Tempo Real' : 'Hardware Pendente'}
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium max-w-sm leading-relaxed tracking-wide opacity-70">
                                        Núcleo local de processamento. Gerencia a segurança biométrica, tablets de visualização e a resiliência do banco de dados offline.
                                    </p>

                                    {agenteOnline && infoAgente && (
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
                                                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Build {infoAgente.versao || '4.2.0'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors">
                                                <div className={`w-1.5 h-1.5 rounded-full ${infoAgente.leitoresAtivos > 0 ? 'bg-emerald-400 shadow-emerald-400/40' : 'bg-orange-400 shadow-orange-400/40'}`} />
                                                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Sensores: {infoAgente.leitoresAtivos > 0 ? 'Prontos' : 'Inativos'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full lg:w-auto">
                                {agenteOnline ? (
                                    <>
                                        <button 
                                            onClick={forcarSincronizacaoLocal} 
                                            className="w-full lg:w-56 h-14 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95"
                                        >
                                            <RefreshCw size={16} />
                                            Sincronizar Agora
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(confirm('ORDEM CRÍTICA: Reiniciar o núcleo do Agente local remotamente?')) {
                                                    enviarComandoAdministrativo('REBOOT_AGENT');
                                                }
                                            }}
                                            disabled={enviandoComando}
                                            className="w-full lg:w-56 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-5px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            <Power size={16} />
                                            Reiniciar Núcleo
                                        </button>
                                    </>
                                ) : (
                                    <a 
                                        href="https://github.com/mateus099803/SCAE/releases/latest" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="w-full lg:w-64 h-16 bg-white text-slate-950 rounded-2xl flex items-center justify-center gap-5 text-[11px] font-black uppercase tracking-[0.3em] hover:bg-slate-100 hover:scale-[1.02] transition-all shadow-2xl active:scale-95"
                                    >
                                        <Download size={20} />
                                        Obter Catraki Agent
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </LayoutAdministrativo>
    );
}

export default PaginaConfiguracoesGerais;
