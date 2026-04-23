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
                    <div className="px-5 py-2.5 bg-blue-50/50 text-blue-600 text-[10px] font-black uppercase tracking-[0.25em] rounded-xl border border-blue-100/50 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        Ambiente Sincronizado
                    </div>
                )
            }
        >
            <div className="space-y-12 max-w-5xl mx-auto pb-32">
                
                {/* 🔒 SEÇÃO: FLUXO DE ACESSO */}
                <section className="space-y-8">
                    <div className="flex flex-col gap-1 ml-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Hardware & Reconhecimento</h2>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Configure como os terminais processam as identidades</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* MÉTODO DE IDENTIFICAÇÃO */}
                        <motion.div 
                            whileHover={{ y: -4 }}
                            className="bg-white border border-slate-100 rounded-2xl p-8 flex flex-col justify-between gap-8 shadow-sm relative overflow-hidden"
                        >
                            <div className="flex gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${metodoAcesso === 'QRCODE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {metodoAcesso === 'QRCODE' ? <Smartphone size={28} /> : <Fingerprint size={28} />}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Médium de Acesso</h3>
                                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest opacity-80">Identificação no terminal.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirMetodoAcesso('QRCODE')} className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metodoAcesso === 'QRCODE' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                    QR Code
                                </button>
                                <button onClick={() => definirMetodoAcesso('DIGITAL')} className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metodoAcesso === 'DIGITAL' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Digital
                                </button>
                            </div>
                        </motion.div>

                        {/* CONTROLE DE SAÍDA */}
                        <motion.div 
                            whileHover={{ y: -4 }}
                            className="bg-white border border-slate-100 rounded-2xl p-8 flex flex-col justify-between gap-8 shadow-sm relative overflow-hidden"
                        >
                            <div className="flex gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${saidaObrigatoria ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                    {saidaObrigatoria ? <DoorClosed size={28} /> : <DoorOpen size={28} />}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Protocolo de Saída</h3>
                                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest opacity-80">Registro de baixa obrigatória.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirSaidaObrigatoria(false)} className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!saidaObrigatoria ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Livre
                                </button>
                                <button onClick={() => definirSaidaObrigatoria(true)} className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${saidaObrigatoria ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Obrigatória
                                </button>
                            </div>
                        </motion.div>

                        {/* PROTOCOLO DINÂMICO */}
                        {metodoAcesso === 'QRCODE' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="col-span-full bg-blue-50 border border-blue-100 rounded-3xl p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-12 shadow-sm"
                            >
                                <div className="flex gap-10 items-start">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 transition-all shadow-xl ${qrDinamico ? 'bg-blue-600 text-white shadow-blue-600/20 ring-8 ring-blue-500/10' : 'bg-white text-slate-300'}`}>
                                        <ShieldAlert size={40} />
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
                                <div className="p-1 bg-white rounded-xl flex h-11 w-full md:w-[240px] shrink-0 border border-slate-200 shadow-sm">
                                    <button onClick={() => definirQrDinamico(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!qrDinamico ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Estático
                                    </button>
                                    <button onClick={() => definirQrDinamico(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${qrDinamico ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Dinâmico
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </section>

                {/* 🔊 SEÇÃO: VOZ E ANÚNCIOS */}
                <section className="space-y-8">
                    <div className="flex flex-col gap-1 ml-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Interatividade & Voz</h2>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Personalize a comunicação sonora do terminal</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
                        <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="flex gap-10 items-start">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 transition-all shadow-xl ${vozAtivada ? 'bg-blue-500 text-white ring-8 ring-blue-500/10' : 'bg-slate-50 text-slate-300'}`}>
                                    {vozAtivada ? <Volume2 size={40} /> : <VolumeX size={40} />}
                                </div>
                                <div className="space-y-3 pt-1">
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Síntese de Voz Operacional</h3>
                                    <p className="text-[13px] text-slate-400 font-medium max-w-xl leading-relaxed uppercase tracking-wider opacity-80">O terminal narra o status do acesso em tempo real, humanizando a interação.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-white rounded-xl flex h-11 w-full md:w-[240px] shrink-0 border border-slate-200 shadow-sm">
                                <button onClick={() => definirVozAtivada(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!vozAtivada ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-500'}`}>
                                    OFF
                                </button>
                                <button onClick={() => definirVozAtivada(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${vozAtivada ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-500'}`}>
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
                                    <div className="mt-8 p-8 bg-blue-50/50 border border-blue-100/50 rounded-[2rem] flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <Smartphone size={24} />
                                        </div>
                                        <p className="text-[12px] text-blue-600 font-black leading-relaxed uppercase tracking-widest opacity-80">
                                            Variável dinâmica: Use <code className="bg-blue-600 text-white px-2 py-0.5 rounded-md font-black mx-1">{"{nome}"}</code> para inserir o prenome do discente na fala.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* ⚙️ SEÇÃO: TELEMETRIA DO AGENTE */}
                <section className="space-y-8">
                    <div className="flex flex-col gap-1 ml-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Operações de Borda</h2>
                        <p className="text-sm text-slate-400 font-medium tracking-tight">Gerenciamento remoto do núcleo local Catraki Edge</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-8 md:p-10 shadow-sm relative overflow-hidden group">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                <div className="relative">
                                    <div className={`w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-sm ${
                                        agenteOnline 
                                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                            : 'bg-slate-50 text-slate-300 border border-slate-100'
                                    }`}>
                                        <Cpu size={48} className={agenteOnline ? 'animate-pulse' : ''} />
                                    </div>
                                    {agenteOnline && (
                                        <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center border-4 border-white shadow-sm animate-bounce">
                                            <Wifi size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-5">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Catraki Edge Agent</h3>
                                        <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
                                            agenteOnline 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>
                                            {agenteOnline ? 'Núcleo em Tempo Real' : 'Hardware Pendente'}
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-[13px] font-bold max-w-sm leading-relaxed tracking-wide uppercase opacity-70">
                                        Núcleo local de processamento. Gerencia a segurança biométrica e a resiliência do banco de dados offline.
                                    </p>
                                    
                                    {agenteOnline && infoAgente && (
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Build {infoAgente.versao || '4.2.0'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all">
                                                <div className={`w-2 h-2 rounded-full ${infoAgente.leitoresAtivos > 0 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-orange-400'}`} />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sensores: {infoAgente.leitoresAtivos > 0 ? 'Prontos' : 'Inativos'}</span>
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
                                            className="w-full lg:w-48 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                                        >
                                            <RefreshCw size={14} />
                                            Sincronizar
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(confirm('ORDEM CRÍTICA: Reiniciar o núcleo do Agente local remotamente?')) {
                                                    enviarComandoAdministrativo('REBOOT_AGENT');
                                                }
                                            }}
                                            disabled={enviandoComando}
                                            className="w-full lg:w-48 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            <Power size={14} />
                                            Reiniciar
                                        </button>
                                    </>
                                ) : (
                                    <a 
                                        href="https://github.com/mateus099803/SCAE/releases/latest" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="w-full lg:w-56 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        <Download size={18} />
                                        Obter Agente
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
