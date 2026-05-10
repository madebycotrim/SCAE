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
    Download,
    Info
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
                    <div className="px-5 py-2.5 bg-blue-50/50 text-blue-600 text-[10px] font-black uppercase tracking-[0.25em] rounded-xl border border-blue-100/50 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        Ambiente Sincronizado
                    </div>
                )
            }
        >
            <div className="space-y-12 max-w-6xl mx-auto pb-32">
                
                {/* 🔒 SEÇÃO: HARDWARE & FLUXO */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between ml-1">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Hardware & Reconhecimento</h2>
                            <p className="text-sm text-slate-400 font-medium tracking-tight">Configure como os terminais processam as identidades</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* MÉTODO DE IDENTIFICAÇÃO */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${metodoAcesso === 'QRCODE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {metodoAcesso === 'QRCODE' ? <Smartphone size={24} /> : <Fingerprint size={24} />}
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Médium de Acesso</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Identificação no terminal.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirMetodoAcesso('QRCODE')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metodoAcesso === 'QRCODE' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                    QR Code
                                </button>
                                <button onClick={() => definirMetodoAcesso('DIGITAL')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metodoAcesso === 'DIGITAL' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Digital
                                </button>
                            </div>
                        </div>

                        {/* CONTROLE DE SAÍDA */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${saidaObrigatoria ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                    {saidaObrigatoria ? <DoorClosed size={24} /> : <DoorOpen size={24} />}
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Protocolo de Saída</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Registro de baixa obrigatória.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirSaidaObrigatoria(false)} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!saidaObrigatoria ? 'bg-white text-amber-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Livre
                                </button>
                                <button onClick={() => definirSaidaObrigatoria(true)} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${saidaObrigatoria ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Obrigatória
                                </button>
                            </div>
                        </div>

                        {/* PROTOCOLO DINÂMICO */}
                        <div className={`bg-white border rounded-2xl p-6 flex flex-col justify-between gap-6 shadow-sm hover:shadow-md transition-all group ${metodoAcesso === 'QRCODE' ? 'border-slate-200 opacity-100' : 'border-slate-100 opacity-40 grayscale pointer-events-none'}`}>
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${qrDinamico ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-slate-50 text-slate-300'}`}>
                                    <ShieldAlert size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Criptografia QR</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-80">Rotação de tokens anti-fraude.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirQrDinamico(false)} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!qrDinamico ? 'bg-white text-slate-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Estático
                                </button>
                                <button onClick={() => definirQrDinamico(true)} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${qrDinamico ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Dinâmico
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 🔊 SEÇÃO: VOZ E ANÚNCIOS */}
                <section className="space-y-6">
                    <div className="flex flex-col gap-1 ml-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Interatividade & Voz</h2>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Personalize a comunicação sonora do terminal</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-100 bg-slate-50/30">
                            <div className="flex gap-6 items-start">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${vozAtivada ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-300'}`}>
                                    {vozAtivada ? <Volume2 size={32} /> : <VolumeX size={32} />}
                                </div>
                                <div className="space-y-1 pt-1 text-left">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Síntese de Voz Operacional</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest opacity-80">O terminal narra o status do acesso em tempo real.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-white rounded-xl flex h-10 w-full md:w-[200px] shrink-0 border border-slate-200 shadow-sm">
                                <button onClick={() => definirVozAtivada(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!vozAtivada ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-500'}`}>
                                    OFF
                                </button>
                                <button onClick={() => definirVozAtivada(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vozAtivada ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                    ON
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {vozAtivada && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="p-8 space-y-8"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 ml-1">
                                                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><CheckCircle2 size={12} /></div>
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Saudação de Sucesso</h4>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={fraseSucesso} 
                                                onChange={(e) => definirFraseSucesso(e.target.value)} 
                                                placeholder="BEM-VINDO AO CATRAKI, {NOME}!" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 h-14 text-sm font-black text-slate-900 placeholder:text-slate-200 focus:bg-white focus:border-slate-400 outline-none transition-all uppercase tracking-tight" 
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 ml-1">
                                                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100"><AlertCircle size={12} /></div>
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Alerta de Restrição</h4>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={fraseErro} 
                                                onChange={(e) => definirFraseErro(e.target.value)} 
                                                placeholder="ACESSO NEGADO. PROCURE A SECRETARIA." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 h-14 text-sm font-black text-slate-900 placeholder:text-slate-200 focus:bg-white focus:border-slate-400 outline-none transition-all uppercase tracking-tight" 
                                            />
                                        </div>
                                    </div>
                                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-5">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                                            <Info size={20} />
                                        </div>
                                        <p className="text-[10px] text-blue-700 font-black leading-relaxed uppercase tracking-widest opacity-80">
                                            Use <code className="bg-blue-600 text-white px-2 py-0.5 rounded-md font-black mx-1">{"{nome}"}</code> para inserir o prenome do aluno na fala.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* ⚙️ SEÇÃO: TELEMETRIA DO AGENTE */}
                <section className="space-y-6">
                    <div className="flex flex-col gap-1 ml-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Operações de Borda</h2>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Gerenciamento remoto do núcleo local Catraki Edge</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br transition-opacity duration-700 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-10 ${agenteOnline ? 'from-emerald-500/30' : 'from-blue-500/30'}`} />
                        
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                <div className="relative">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-sm border ${
                                        agenteOnline 
                                            ? 'bg-blue-600 text-white border-blue-500' 
                                            : 'bg-slate-50 text-slate-300 border-slate-200'
                                    }`}>
                                        <Cpu size={40} className={agenteOnline ? 'animate-pulse' : ''} />
                                    </div>
                                    {agenteOnline && (
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                                            <Wifi size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Catraki Edge Agent</h3>
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-all ${
                                            agenteOnline 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                        }`}>
                                            {agenteOnline ? 'Conexão Ativa' : 'Hardware Desconectado'}
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-[11px] font-bold max-w-sm leading-relaxed tracking-wide uppercase opacity-70">
                                        Gerencia a segurança biométrica e a resiliência do banco de dados offline no local.
                                    </p>
                                    
                                    {agenteOnline && infoAgente && (
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                Build {infoAgente.versao || '4.2.0'}
                                            </div>
                                            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                Sensores: {infoAgente.leitoresAtivos > 0 ? 'ONLINE' : 'OFFLINE'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 w-full lg:w-auto">
                                {agenteOnline ? (
                                    <>
                                        <Botao variante="secundario" tamanho="lg" onClick={forcarSincronizacaoLocal} icone={RefreshCw} fullWidth className="rounded-xl">
                                            Sincronizar
                                        </Botao>
                                        <Botao variante="primario" tamanho="lg" onClick={() => {
                                            if(confirm('ORDEM CRÍTICA: Reiniciar o núcleo do Agente local remotamente?')) {
                                                enviarComandoAdministrativo('REBOOT_AGENT');
                                            }
                                        }} disabled={enviandoComando} icone={Power} fullWidth className="rounded-xl shadow-lg shadow-blue-600/20">
                                            Reiniciar
                                        </Botao>
                                    </>
                                ) : (
                                    <Botao variante="primario" tamanho="lg" onClick={() => window.open('https://github.com/mateus099803/SCAE/releases/latest', '_blank')} icone={Download} fullWidth className="rounded-xl shadow-lg shadow-blue-600/20">
                                        Obter Agente
                                    </Botao>
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
