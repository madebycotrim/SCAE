import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, CartaoConteudo } from '@/compartilhado/componentes/UI';
import { ShieldAlert, WifiOff, Wifi, Volume2, VolumeX, Loader2, DoorOpen, DoorClosed, ScanFace, Fingerprint, Smartphone } from 'lucide-react';
import { usarConfiguracoesEscola } from '@/compartilhado/hooks/usarConfiguracoesEscola';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

export function PaginaConfiguracoes() {
    const { configs, salvar, salvando, isLoading } = usarConfiguracoesEscola();

    const [protocolo, definirProtocolo] = useState<boolean>(false);
    const [tts, definirTts] = useState<boolean>(false);
    const [saidaObrigatoria, definirSaidaObrigatoria] = useState<boolean>(true);
    const [metodo, definirMetodo] = useState<'QRCODE' | 'FACIAL' | 'DIGITAL'>('QRCODE');

    useEffect(() => {
        if (configs) {
            definirProtocolo(configs.qrDinamico || false);
            definirTts(configs.ttsAtivado ?? true);
            definirSaidaObrigatoria(configs.saidaObrigatoria ?? true);
            definirMetodo(configs.metodoAcesso || 'QRCODE');
        }
    }, [configs]);

    const salvarConfiguracoes = async () => {
        try {
            await salvar({
                qrDinamico: protocolo,
                ttsAtivado: tts,
                saidaObrigatoria,
                metodoAcesso: metodo
            });
            // O hook do react-query já solta um toast
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

    const alterou = configs?.qrDinamico !== protocolo || configs?.ttsAtivado !== tts || configs?.saidaObrigatoria !== saidaObrigatoria || (configs?.metodoAcesso || 'QRCODE') !== metodo;

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

                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    {/* Left Info Section */}
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${protocolo ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                            <ShieldAlert strokeWidth={2.5} size={24} />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                                    Protocolo de Validação
                                </h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${protocolo ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-slate-500 bg-slate-100 border-slate-200/60'}`}>
                                    {protocolo ? 'Anti-Fraude Ativo' : 'Funcionamento Offline'}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">
                                {protocolo 
                                    ? "Codificação dinâmica que expira a cada 15 segundos. Impede o uso de prints e fotos do cartão." 
                                    : "O código permanece o mesmo. Ideal para locais onde o aluno possui pouco sinal de internet."}
                            </p>
                        </div>
                    </div>

                    {/* Right Toggle Section */}
                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button
                            onClick={() => definirProtocolo(false)}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!protocolo
                                ? 'bg-white text-indigo-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <WifiOff size={14} className={!protocolo ? 'text-indigo-500' : 'text-slate-400'} strokeWidth={2.5} />
                            QR Estático
                        </button>
                        <button
                            onClick={() => definirProtocolo(true)}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${protocolo
                                ? 'bg-amber-500 text-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-amber-400'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <Wifi size={14} className={protocolo ? 'text-white' : 'text-slate-400'} strokeWidth={2.5} />
                            QR Dinâmico
                        </button>
                    </div>
                </CartaoConteudo>


                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    {/* Left Info Section */}
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${tts ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            {tts ? <Volume2 strokeWidth={2.5} size={24} /> : <VolumeX strokeWidth={2.5} size={24} />}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                                    Leitura Falada (TTS)
                                </h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${tts ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-500 bg-slate-100 border-slate-200/60'}`}>
                                    {tts ? 'Sistemático' : 'Silêncioso'}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">
                                O quiosque de portaria anuncia os nomes dos alunos em voz alta durante o registro do QRCode.
                            </p>
                        </div>
                    </div>

                    {/* Right Toggle Section */}
                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button
                            onClick={() => definirTts(false)}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!tts
                                ? 'bg-white text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <VolumeX size={14} className={!tts ? 'text-slate-500' : 'text-slate-400'} strokeWidth={2.5} />
                            Desligado
                        </button>
                        <button
                            onClick={() => definirTts(true)}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tts
                                ? 'bg-indigo-600 text-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-indigo-600'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <Volume2 size={14} className={tts ? 'text-white' : 'text-slate-400'} strokeWidth={2.5} />
                            Ligado
                        </button>
                    </div>
                </CartaoConteudo>


                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${saidaObrigatoria ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                            {saidaObrigatoria ? <DoorClosed strokeWidth={2.5} size={24} /> : <DoorOpen strokeWidth={2.5} size={24} />}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                                    Controle de Saída
                                </h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none h-4 border ${saidaObrigatoria ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                                    {saidaObrigatoria ? 'Rígido' : 'Liberado'}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-lg leading-relaxed mt-1">
                                {saidaObrigatoria
                                    ? 'A catraca exige validação de saída e registra a baixa do horário. Impede que o aluno pule a catraca.'
                                    : 'A saída é de fluxo livre sem a necessidade do QR Code.'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button
                            onClick={() => definirSaidaObrigatoria(false)}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!saidaObrigatoria
                                ? 'bg-white text-emerald-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <DoorOpen size={14} className={!saidaObrigatoria ? 'text-emerald-500' : 'text-slate-400'} strokeWidth={2.5} />
                            Fluxo Aberto
                        </button>
                        <button
                            onClick={() => definirSaidaObrigatoria(true)}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saidaObrigatoria
                                ? 'bg-indigo-600 text-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-indigo-600'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <DoorClosed size={14} className={saidaObrigatoria ? 'text-white' : 'text-slate-400'} strokeWidth={2.5} />
                            Obrigatória
                        </button>
                    </div>
                </CartaoConteudo>


                <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-auto">
                    <div className="flex gap-6 items-start">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${metodo === 'QRCODE' ? 'bg-blue-50 border-blue-100 text-blue-600' : metodo === 'FACIAL' ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                            {metodo === 'QRCODE' ? <Smartphone strokeWidth={2.5} size={24} /> : metodo === 'FACIAL' ? <ScanFace strokeWidth={2.5} size={24} /> : <Fingerprint strokeWidth={2.5} size={24} />}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                                    Método de Reconhecimento
                                </h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 border border-slate-200/60 leading-none h-4">
                                    Tecnologia
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xl leading-relaxed mt-1">
                                Defina o mecanismo primário de identificação suportado pela portaria. QR Code via aplicativo, Biometria de dedo ou o módulo unificado de reconhecimento Biométrico Facial.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 flex items-center shrink-0 w-full md:w-auto h-[52px]">
                        <button
                            onClick={() => definirMetodo('QRCODE')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodo === 'QRCODE'
                                ? 'bg-white text-blue-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <Smartphone size={14} className={metodo === 'QRCODE' ? 'text-blue-500' : 'text-slate-400'} strokeWidth={2.5} />
                            Cartão / QR
                        </button>
                        <button
                            onClick={() => definirMetodo('DIGITAL')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodo === 'DIGITAL'
                                ? 'bg-white text-emerald-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <Fingerprint size={14} className={metodo === 'DIGITAL' ? 'text-emerald-500' : 'text-slate-400'} strokeWidth={2.5} />
                            Digital
                        </button>
                        <button
                            onClick={() => definirMetodo('FACIAL')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2.5 px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodo === 'FACIAL'
                                ? 'bg-white text-purple-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                }`}
                        >
                            <ScanFace size={14} className={metodo === 'FACIAL' ? 'text-purple-500' : 'text-slate-400'} strokeWidth={2.5} />
                            Facial
                        </button>
                    </div>
                </CartaoConteudo>

            </div>
        </LayoutAdministrativo>
    );
}

export default PaginaConfiguracoes;
