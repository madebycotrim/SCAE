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
                    <Botao variante="primario" tamanho="lg" onClick={salvarConfiguracoes} loading={salvando}>
                        Salvar Alterações
                    </Botao>
                ) : (
                    <div className="px-4 py-2 border border-slate-200 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl">
                        Tudo Salvo
                    </div>
                )
            }
        >
            <div className="space-y-6 max-w-5xl">
                {metodo === 'QRCODE' && (
                    <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                        <div className="flex gap-6 items-start">
                            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${protocolo ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                <ShieldAlert strokeWidth={2.5} size={24} />
                            </div>
                            <div className="flex flex-col gap-1.5 mt-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Protocolo de Validação</h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${protocolo ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-slate-500 bg-slate-100 border-slate-200/60'}`}>
                                        {protocolo ? 'Anti-Fraude Ativo' : 'Funcionamento Offline'}
                                    </span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">
                                    {protocolo ? "Codificação dinâmica que expira a cada 15 segundos." : "O código permanece o mesmo. Ideal para locais com pouco sinal."}
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                            <button onClick={() => definirProtocolo(false)} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!protocolo ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                                <WifiOff size={14} strokeWidth={2.5} /> QR Estático
                            </button>
                            <button onClick={() => definirProtocolo(true)} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${protocolo ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                                <Wifi size={14} strokeWidth={2.5} /> QR Dinâmico
                            </button>
                        </div>
                    </CartaoConteudo>
                )}

                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl overflow-hidden">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                        <div className="flex gap-6 items-start">
                            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${tts ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                {tts ? <Volume2 strokeWidth={2.5} size={24} /> : <VolumeX strokeWidth={2.5} size={24} />}
                            </div>
                            <div className="flex flex-col gap-1.5 mt-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Notificação por Voz (TTS)</h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${tts ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-500 bg-slate-100 border-slate-200/60'}`}>
                                        {tts ? 'Ativado' : 'Silencioso'}
                                    </span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">O terminal anuncia os nomes dos alunos em voz alta durante o registro.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                            <button onClick={() => definirTts(false)} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!tts ? 'bg-white text-slate-700 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                                <VolumeX size={14} strokeWidth={2.5} /> Desativado
                            </button>
                            <button onClick={() => definirTts(true)} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tts ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                                <Volume2 size={14} strokeWidth={2.5} /> Ativado
                            </button>
                        </div>
                    </div>

                    {tts && (
                        <div className="px-6 md:px-8 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={16} /></div>
                                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Frase de Sucesso</h4>
                                        </div>
                                        <input type="text" value={fraseSucesso} onChange={(e) => definirFraseSucesso(e.target.value)} placeholder="Ex: Bem-vindo, {nome}!" className="w-full bg-white border border-slate-200 rounded-xl px-4 h-11 text-xs font-bold focus:border-emerald-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500"><AlertCircle size={16} /></div>
                                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Frase de Erro / Negado</h4>
                                        </div>
                                        <input type="text" value={fraseErro} onChange={(e) => definirFraseErro(e.target.value)} placeholder="Ex: Acesso não autorizado." className="w-full bg-white border border-slate-200 rounded-xl px-4 h-11 text-xs font-bold focus:border-rose-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-200/60">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed flex items-center gap-2">
                                        <Smartphone size={10} className="text-indigo-400" />
                                        DICA: Use <code className="text-indigo-500 bg-indigo-50 px-1 rounded">{'{nome}'}</code> para falar o nome do aluno.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CartaoConteudo>

                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${saidaObrigatoria ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                            {saidaObrigatoria ? <DoorClosed strokeWidth={2.5} size={24} /> : <DoorOpen strokeWidth={2.5} size={24} />}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Controle de Saída</h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${saidaObrigatoria ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                                    {saidaObrigatoria ? 'Rígido' : 'Liberado'}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">
                                {saidaObrigatoria ? 'A catraca exige validação de saída.' : 'A saída é de fluxo livre.'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button onClick={() => definirSaidaObrigatoria(false)} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!saidaObrigatoria ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                            <DoorOpen size={14} strokeWidth={2.5} /> Fluxo Aberto
                        </button>
                        <button onClick={() => definirSaidaObrigatoria(true)} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saidaObrigatoria ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                            <DoorClosed size={14} strokeWidth={2.5} /> Obrigatória
                        </button>
                    </div>
                </CartaoConteudo>

                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${metodo === 'QRCODE' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                            {metodo === 'QRCODE' ? <Smartphone strokeWidth={2.5} size={24} /> : <Fingerprint strokeWidth={2.5} size={24} />}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Método de Reconhecimento</h3>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xl leading-relaxed mt-1">Defina o mecanismo primário: QR Code ou Biometria.</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button onClick={() => definirMetodo('QRCODE')} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodo === 'QRCODE' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                            <Smartphone size={14} strokeWidth={2.5} /> Cartão / QR
                        </button>
                        <button onClick={() => definirMetodo('DIGITAL')} className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodo === 'DIGITAL' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:bg-slate-100/50'}`}>
                            <Fingerprint size={14} strokeWidth={2.5} /> Digital
                        </button>
                    </div>
                </CartaoConteudo>

                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${statusAgente === 'RODANDO' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                            <Cpu strokeWidth={2.5} size={24} />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Catraki Edge Agent</h3>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${statusAgente === 'RODANDO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                    {statusAgente === 'RODANDO' ? 'Online na Máquina' : 'Não Detectado'}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xl leading-relaxed mt-1">{statusAgente === 'RODANDO' ? `Software rodando localmente (v${infoAgente?.versao}).` : "O Agente não foi detectado."}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Botao variante="ghost" tamanho="sm" onClick={() => verificarAgente(true)} className="border-slate-200 text-[10px] font-black uppercase tracking-widest">Atualizar Status</Botao>
                    </div>
                </CartaoConteudo>
            </div>
        </LayoutAdministrativo>
    );
}

export default PaginaConfiguracoes;
