import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, CartaoConteudo } from '@/compartilhado/componentes/UI';
import { ShieldAlert, WifiOff, Wifi, Volume2, VolumeX, Loader2, DoorOpen, DoorClosed, Fingerprint, Smartphone, Cpu, CheckCircle2, AlertCircle, Settings, Power, RefreshCw, Download } from 'lucide-react';
import { usarConfiguracoesEscola } from '@/compartilhado/hooks/usarConfiguracoesEscola';
import { api } from '@/compartilhado/servicos/api';
import toast from 'react-hot-toast';
import { usarAgente } from '@/compartilhado/contextos/ContextoAgente';

export function PaginaConfiguracoes() {
    const { configs, salvar, salvando, isLoading } = usarConfiguracoesEscola();
    const { online: agenteOnline, agente: infoAgente, forcarVerificacao } = usarAgente();

    const [protocolo, definirProtocolo] = useState<boolean>(false);
    const [tts, definirTts] = useState<boolean>(false);
    const [saidaObrigatoria, definirSaidaObrigatoria] = useState<boolean>(true);
    const [metodo, definirMetodo] = useState<'QRCODE' | 'DIGITAL'>('QRCODE');
    const [fraseSucesso, definirFraseSucesso] = useState<string>('');
    const [fraseErro, definirFraseErro] = useState<string>('');
    
    // --- ESTADO DE UI ---
    const [enviandoComando, setEnviandoComando] = useState(false);

    const enviarComandoRemoto = async (acao: string, params: any = {}) => {
        const toastId = toast.loading('Enviando ordem para o Agente...');
        setEnviandoComando(true);
        try {
            await api.enviar('/agente/comandos', { acao, params });
            toast.success('Comando enfileirado! O Agente executará em instantes.', { id: toastId });
        } catch (e: any) {
            toast.error(`Falha ao enviar: ${e.message}`, { id: toastId });
        } finally {
            setEnviandoComando(false);
        }
    };

    const sincronizarAgora = async () => {
        try {
            // Sincronização forçada ignora o circuito se o usuário clicou no botão
            await fetch('http://localhost:1912/sync-now', { method: 'POST', mode: 'no-cors' });
            toast.success('Sincronização local iniciada!');
            forcarVerificacao();
        } catch {
            toast.error('Não foi possível falar com o Agente local.');
        }
    };

    useEffect(() => {
        if (configs) {
            definirProtocolo(configs.qrDinamico || false);
            definirTts(configs.ttsAtivado ?? true);
            definirSaidaObrigatoria(configs.saidaObrigatoria ?? true);
            definirMetodo(configs.metodoAcesso || 'QRCODE');
            definirFraseSucesso(configs.ttsFraseSucesso ?? '');
            definirFraseErro(configs.ttsFraseErro ?? '');
        }
    }, [configs]);

    const salvarConfiguracoes = async () => {
        try {
            await salvar({
                qrDinamico: protocolo,
                ttsAtivado: tts,
                ttsFraseSucesso: fraseSucesso,
                ttsFraseErro: fraseErro,
                saidaObrigatoria,
                metodoAcesso: metodo
            });
        } catch (e) {
            toast.error('Erro ao salvar as configurações.');
        }
    };

    if (isLoading) {
        return (
            <LayoutAdministrativo titulo="Configurações">
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-eletrico" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Preferências...</span>
                </div>
            </LayoutAdministrativo>
        );
    }

    const alterou = configs?.qrDinamico !== protocolo || 
                    configs?.ttsAtivado !== tts || 
                    configs?.ttsFraseSucesso !== fraseSucesso || 
                    configs?.ttsFraseErro !== fraseErro || 
                    configs?.saidaObrigatoria !== saidaObrigatoria || 
                    (configs?.metodoAcesso || 'QRCODE') !== metodo;

    return (
        <LayoutAdministrativo
            titulo="Configurações GERAIS"
            subtitulo="Ajustes globais do sistema de controle de acesso para sua unidade"
            acoes={
                alterou ? (
                    <Botao variante="primario" tamanho="lg" onClick={salvarConfiguracoes} carregando={salvando} className="rounded-2xl shadow-sm">
                        Salvar Alterações
                    </Botao>
                ) : (
                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl">
                        Tudo Salvo
                    </div>
                )
            }
        >
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
                
                {/* 🔒 SEÇÃO: ACESSO */}
                <div className="space-y-4">
                    <div className="px-1 flex items-center gap-2">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Acesso</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* MÉTODO DE RECONHECIMENTO */}
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all hover:border-indigo-200 shadow-sm">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${metodo === 'QRCODE' ? 'bg-eletrico/10 text-eletrico' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {metodo === 'QRCODE' ? <Smartphone size={24} /> : <Fingerprint size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[13px] font-bold text-slate-900">Método de Identificação</h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Escolha entre validação por Biometria ou Cartão/QR Code.</p>
                                </div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-2xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirMetodo('QRCODE')} className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${metodo === 'QRCODE' ? 'bg-white text-eletrico shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    QR Code / Cartão
                                </button>
                                <button onClick={() => definirMetodo('DIGITAL')} className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${metodo === 'DIGITAL' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Biometria
                                </button>
                            </div>
                        </div>

                        {/* CONTROLE DE SAÍDA */}
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all hover:border-slate-300 shadow-sm">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${saidaObrigatoria ? 'bg-slate-100 text-slate-900' : 'bg-amber-50 text-amber-600'}`}>
                                    {saidaObrigatoria ? <DoorClosed size={24} /> : <DoorOpen size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[13px] font-bold text-slate-900">Validar Saída</h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Define se o aluno precisa registrar a saída na catraca.</p>
                                </div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-2xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirSaidaObrigatoria(false)} className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${!saidaObrigatoria ? 'bg-white text-amber-600 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Fluxo Livre
                                </button>
                                <button onClick={() => definirSaidaObrigatoria(true)} className={`flex items-center justify-center gap-2 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${saidaObrigatoria ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Obrigatória
                                </button>
                            </div>
                        </div>

                        {/* PROTOCOLO DINÂMICO */}
                        {metodo === 'QRCODE' && (
                            <div className="col-span-full bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:border-eletrico/20 group shadow-sm">
                                <div className="flex gap-5 items-start">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${protocolo ? 'bg-eletrico/5 text-eletrico outline outline-4 outline-eletrico/5' : 'bg-slate-50 text-slate-400'}`}>
                                        <ShieldAlert size={28} />
                                    </div>
                                    <div className="space-y-1.5 pt-0.5">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-bold text-slate-900">Protocolo de Validação Dinâmica</h3>
                                            <span className={`px-2 py-0.5 rounded-2xl text-[8px] font-black uppercase tracking-wider border ${protocolo ? 'bg-eletrico/5 text-eletrico border-eletrico/10' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                {protocolo ? 'Anti-Fraude Ativo' : 'Offline'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium max-w-xl leading-relaxed">
                                            {protocolo 
                                                ? "Geração de códigos que expiram a cada 15s para evitar cópias e capturas de tela." 
                                                : "O código do aluno permanece o mesmo durante todo o período letivo."}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-1 bg-slate-50 rounded-2xl flex h-11 w-full md:w-[260px] shrink-0 border border-slate-100">
                                    <button onClick={() => definirProtocolo(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${!protocolo ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Estático
                                    </button>
                                    <button onClick={() => definirProtocolo(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${protocolo ? 'bg-white text-eletrico shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Dinâmico
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔊 SEÇÃO: VOZ */}
                <div className="space-y-4">
                    <div className="px-1 flex items-center gap-2">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Falas e Notificações</h2>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden group hover:border-pink-200 transition-all shadow-sm">
                        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex gap-5 items-start">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${tts ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-400'}`}>
                                    {tts ? <Volume2 size={28} /> : <VolumeX size={28} />}
                                </div>
                                <div className="space-y-1.5 pt-0.5">
                                    <h3 className="text-sm font-bold text-slate-900">Anúncio por Voz (TTS)</h3>
                                    <p className="text-[11px] text-slate-500 font-medium max-w-xl leading-relaxed">O terminal fala o nome do aluno em voz alta para confirmação imediata.</p>
                                </div>
                            </div>
                            <div className="p-1 bg-slate-50 rounded-2xl flex h-11 w-full md:w-[260px] shrink-0 border border-slate-100">
                                <button onClick={() => definirTts(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${!tts ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                    Silencioso
                                </button>
                                <button onClick={() => definirTts(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${tts ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                    Ativado
                                </button>
                            </div>
                        </div>

                        {tts && (
                            <div className="px-6 md:px-8 pb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><CheckCircle2 size={12} /></div>
                                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sucesso</h4>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={fraseSucesso} 
                                            onChange={(e) => definirFraseSucesso(e.target.value)} 
                                            placeholder="Ex: Bem-vindo, {nome}!" 
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 h-12 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-eletrico outline-none transition-all" 
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100"><AlertCircle size={12} /></div>
                                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Negado</h4>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={fraseErro} 
                                            onChange={(e) => definirFraseErro(e.target.value)} 
                                            placeholder="Ex: Acesso não autorizado." 
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 h-12 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-rose-400 outline-none transition-all" 
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                                        <Smartphone size={16} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Dica: O termo <code className="text-eletrico font-black mx-1">{"{nome}"}</code> será substituído pelo primeiro nome do aluno.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ⚙️ SEÇÃO: AGENTE LOCAL */}
                <div className="space-y-6">
                    <div className="px-1 flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Cpu size={12} className="text-slate-300" />
                            Serviço Local (On-Premise)
                        </h2>
                        {agenteOnline && (
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                Sistema Live
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Monitor de Status do Agente (Industrial Style) */}
                        <div className="bg-slate-900 rounded-2xl p-8 md:p-10 shadow-2xl shadow-slate-900/10 border border-slate-800 relative overflow-hidden group">
                            
                            {/* Efeito Visual de Fundo (Scanlines sutil) */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 2px)', backgroundSize: '100% 3px' }} />

                            <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                    {/* Icone com Pulso Central */}
                                    <div className="relative group/icon">
                                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
                                            agenteOnline 
                                                ? 'bg-indigo-500 text-white shadow-indigo-500/20' 
                                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                                        }`}>
                                            <Cpu size={40} className={agenteOnline ? 'animate-pulse' : ''} />
                                        </div>
                                        {agenteOnline && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-slate-900 animate-bounce">
                                                <Wifi size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Catraki Edge Agent</h3>
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                agenteOnline 
                                                    ? 'bg-emerald-500 text-white border-emerald-400' 
                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                                {agenteOnline ? 'Agente Conectado' : 'Aguardando Agente'}
                                            </div>
                                        </div>
                                        <p className="text-slate-400 text-xs font-medium max-w-sm leading-relaxed">
                                            Interface local operacional. Gerencia leitores biométricos, tablets e a sincronização do banco de dados offline.
                                        </p>

                                        {/* Telemetria Rápida */}
                                        {agenteOnline && infoAgente && (
                                            <div className="flex flex-wrap gap-4 mt-4">
                                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Versão {infoAgente.versao || '4.0.0'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                                    <div className={`w-2 h-2 rounded-full ${infoAgente.leitoresAtivos > 0 ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Hardware: {infoAgente.leitoresAtivos > 0 ? 'Ativo' : 'Offline'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full lg:w-auto">
                                    {agenteOnline ? (
                                        <>
                                            <button 
                                                onClick={sincronizarAgora} 
                                                className="w-full lg:w-48 h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <RefreshCw size={14} />
                                                Sincronizar
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(confirm('Reiniciar o Agente remotamente?')) {
                                                        enviarComandoRemoto('REBOOT_AGENT');
                                                    }
                                                }}
                                                disabled={enviandoComando}
                                                className="w-full lg:w-48 h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
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
                                            className="w-full lg:w-56 h-14 bg-white text-slate-900 rounded-2xl flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl"
                                        >
                                            <Download size={18} />
                                            Obter Agent .exe
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}

export default PaginaConfiguracoes;
