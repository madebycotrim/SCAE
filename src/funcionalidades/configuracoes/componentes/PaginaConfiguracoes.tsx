import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, CartaoConteudo } from '@/compartilhado/componentes/UI';
import { ShieldAlert, WifiOff, Wifi, Volume2, VolumeX, Loader2, DoorOpen, DoorClosed, Fingerprint, Smartphone, Cpu, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { usarConfiguracoesEscola } from '@/compartilhado/hooks/usarConfiguracoesEscola';
import toast from 'react-hot-toast';

export function PaginaConfiguracoes() {
    const { configs, salvar, salvando, isLoading } = usarConfiguracoesEscola();

    const [protocolo, definirProtocolo] = useState<boolean>(false);
    const [tts, definirTts] = useState<boolean>(false);
    const [saidaObrigatoria, definirSaidaObrigatoria] = useState<boolean>(true);
    const [metodo, definirMetodo] = useState<'QRCODE' | 'DIGITAL'>('QRCODE');
    const [fraseSucesso, definirFraseSucesso] = useState<string>('');
    const [fraseErro, definirFraseErro] = useState<string>('');
    
    // --- ESTADO DO AGENTE LOCAL ---
    const [statusAgente, setStatusAgente] = useState<'DESCONHECIDO' | 'RODANDO' | 'AUSENTE'>('DESCONHECIDO');
    const [infoAgente, setInfoAgente] = useState<any>(null);

    const verificarAgente = async (comSync = false) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            // 1. Pega status básico (v1.6.2+)
            const res = await fetch('http://127.0.0.1:1912/ping', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const dados = await res.json();
                setStatusAgente('RODANDO');
                setInfoAgente(dados);

                // 2. Comanda um Sync IMEDIATO apenas se solicitado MANUALMENTE
                if (comSync) {
                    fetch('http://127.0.0.1:1912/sync-now', { method: 'POST', mode: 'no-cors' }).catch(() => {});
                }
            } else { throw new Error(); }
        } catch (e) {
            setStatusAgente('AUSENTE');
            setInfoAgente(null);
        }
    };

    useEffect(() => {
        verificarAgente(false); // Só o ping no boot
        const interval = setInterval(() => verificarAgente(false), 10000); // Polling silencioso
        return () => clearInterval(interval);
    }, []);

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
                <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Carregando Preferências</span>
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
                    <Botao variante="primario" tamanho="lg" onClick={salvarConfiguracoes} loading={salvando} className="rounded-xl shadow-sm">
                        Salvar Alterações
                    </Botao>
                ) : (
                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl">
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
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all hover:border-indigo-200">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${metodo === 'QRCODE' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {metodo === 'QRCODE' ? <Smartphone size={24} /> : <Fingerprint size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[13px] font-bold text-slate-900">Método de Identificação</h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Escolha entre validação por Biometria ou Cartão/QR Code.</p>
                                </div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirMetodo('QRCODE')} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${metodo === 'QRCODE' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    QR Code / Cartão
                                </button>
                                <button onClick={() => definirMetodo('DIGITAL')} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${metodo === 'DIGITAL' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Biometria
                                </button>
                            </div>
                        </div>

                        {/* CONTROLE DE SAÍDA */}
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all hover:border-slate-300">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${saidaObrigatoria ? 'bg-slate-100 text-slate-900' : 'bg-amber-50 text-amber-600'}`}>
                                    {saidaObrigatoria ? <DoorClosed size={24} /> : <DoorOpen size={24} />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[13px] font-bold text-slate-900">Validar Saída</h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Define se o aluno precisa registrar a saída na catraca.</p>
                                </div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-xl grid grid-cols-2 gap-1 border border-slate-100">
                                <button onClick={() => definirSaidaObrigatoria(false)} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${!saidaObrigatoria ? 'bg-white text-amber-600 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Fluxo Livre
                                </button>
                                <button onClick={() => definirSaidaObrigatoria(true)} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${saidaObrigatoria ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}>
                                    Obrigatória
                                </button>
                            </div>
                        </div>

                        {/* PROTOCOLO DINÂMICO */}
                        {metodo === 'QRCODE' && (
                            <div className="col-span-full bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:border-violet-200 group">
                                <div className="flex gap-5 items-start">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${protocolo ? 'bg-violet-50 text-violet-600 outline outline-4 outline-violet-50/50' : 'bg-slate-50 text-slate-400'}`}>
                                        <ShieldAlert size={28} />
                                    </div>
                                    <div className="space-y-1.5 pt-0.5">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-bold text-slate-900">Protocolo de Validação Dinâmica</h3>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${protocolo ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
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
                                <div className="p-1 bg-slate-50 rounded-xl flex h-11 w-full md:w-[260px] shrink-0 border border-slate-100">
                                    <button onClick={() => definirProtocolo(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${!protocolo ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                        Estático
                                    </button>
                                    <button onClick={() => definirProtocolo(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${protocolo ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
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

                    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden group hover:border-pink-200 transition-all">
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
                            <div className="p-1 bg-slate-50 rounded-xl flex h-11 w-full md:w-[260px] shrink-0 border border-slate-100">
                                <button onClick={() => definirTts(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${!tts ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                    Silencioso
                                </button>
                                <button onClick={() => definirTts(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${tts ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
                                    Ativado
                                </button>
                            </div>
                        </div>

                        {tts && (
                            <div className="px-6 md:px-8 pb-8 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={12} /></div>
                                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sucesso</h4>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={fraseSucesso} 
                                            onChange={(e) => definirFraseSucesso(e.target.value)} 
                                            placeholder="Ex: Bem-vindo, {nome}!" 
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 h-12 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-indigo-400 outline-none transition-all" 
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center"><AlertCircle size={12} /></div>
                                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Negado</h4>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={fraseErro} 
                                            onChange={(e) => definirFraseErro(e.target.value)} 
                                            placeholder="Ex: Acesso não autorizado." 
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 h-12 text-[13px] font-medium text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-rose-400 outline-none transition-all" 
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                        <Smartphone size={16} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Dica: O termo <code className="text-indigo-600 font-black mx-1">{"{nome}"}</code> será substituído pelo primeiro nome do aluno.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ⚙️ SEÇÃO: AGENTE LOCAL */}
                <div className="space-y-4">
                    <div className="px-1 flex items-center gap-2">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Serviço Local (On-Premise)</h2>
                    </div>

                    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:border-slate-300 group">
                        <div className="flex gap-5 items-start">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${statusAgente === 'RODANDO' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                <Cpu size={28} />
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-bold text-slate-900 leading-none">Catraki Edge Agent</h3>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60">
                                        {statusAgente === 'RODANDO' ? `Operacional (v${infoAgente?.versao || '2.0'})` : 'Desconectado'}
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium max-w-xl leading-relaxed">Interface técnica para gerenciar o hardware local a partir da nuvem.</p>
                            </div>
                        </div>
                        <Botao 
                            variante="secundario" 
                            tamanho="sm" 
                            onClick={() => verificarAgente(true)} 
                            className="rounded-xl border border-slate-200 text-[10px] font-bold uppercase tracking-widest px-6"
                        >
                            Atualizar
                        </Botao>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}

export default PaginaConfiguracoes;
