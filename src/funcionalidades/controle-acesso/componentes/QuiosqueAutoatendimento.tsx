/**
 * QuiosqueAutoatendimento — Componente MAE do quiosque.
 *
 * Responsabilidades:
 * - UI shell: header, camera frame, sidebar, feedback overlay
 * - Registro de acesso (servicoSincronizacao)
 * - TTS (anunciarNome)
 * - Auditoria
 *
 * Delega a DETECCAO para os filhos:
 * - usarLeitorQRCode  (metodoAcesso === 'QRCODE')
 * - usarLeitorFacial   (metodoAcesso === 'FACIAL')
 * - usarLeitorDigital   (metodoAcesso === 'DIGITAL')
 */
import { useState, useCallback, useEffect } from 'react';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import type { DadosAluno } from '../servicos/cacheMemoria';
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarInstalacaoPWA } from '@/compartilhado/hooks/usarInstalacaoPWA';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { usarTipoAcesso } from '../hooks/usarTipoAcesso';
import { usarModoFila } from '../hooks/usarModoFila';
import { usarControleAcessoWorker } from '../hooks/usarControleAcessoWorker';
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { anunciarNome } from '../utils/anunciarNome';
import { buscarAlunoEmCache, alunoEstaRevogado } from '../servicos/cacheMemoria';
import { Registrador, ACOES_AUDITORIA } from '@/compartilhado/servicos/auditoria';
import { TIPO_ACESSO } from '../types/controleAcesso.tipos';
import { StatusConexao } from './StatusConexao';
import { ShieldCheck, UserX, Clock, Fingerprint, User, Eye, QrCode } from 'lucide-react';

// Filhos — cada um cuida da sua deteccao
import { usarLeitorQRCode } from './LeitorQRCode';
import { usarLeitorFacial } from './LeitorFacial';
import { usarLeitorDigital } from './LeitorDigital';

const log = criarRegistrador('ControleAcesso:Quiosque');
const ELEMENTO_CAMERA_ID = 'quiosque-camera';

interface FeedbackAcesso {
    aluno?: DadosAluno;
    mensagem: string;
    hora: string;
}

export default function QuiosqueAutoatendimento() {
    const escola = usarEscola();
    const { usuarioAtual } = usarAutenticacao();
    const tipoAcessoAtual = usarTipoAcesso();
    const confFila = usarModoFila();
    const { acionarWorker } = usarControleAcessoWorker();
    const { podeInstalar, instalarApp } = usarInstalacaoPWA();

    const [ultimoAcesso, definirUltimoAcesso] = useState<FeedbackAcesso | null>(null);
    const [statusLeitura, definirStatusLeitura] = useState<'AGUARDANDO' | 'SUCESSO' | 'ERRO'>('AGUARDANDO');
    const [dataHora, definirDataHora] = useState(new Date());

    // Relogio em tempo real
    useEffect(() => {
        const timer = setInterval(() => definirDataHora(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ========================================================
    // CALLBACK CENTRAL — chamado por qualquer filho
    // ========================================================
    const registrarAcesso = useCallback(async (matricula: string, metodoLeitura: string) => {
        if (alunoEstaRevogado(matricula)) {
            definirStatusLeitura('ERRO');
            definirUltimoAcesso({ mensagem: 'Acesso Revogado.', hora: format(Date.now(), 'HH:mm') });
            Registrador.registrar(ACOES_AUDITORIA.TENTATIVA_ACESSO_NEGADO, 'controle-acesso', 'quiosque', { matricula: '***' });
            setTimeout(() => definirStatusLeitura('AGUARDANDO'), confFila.duracaoFeedbackMs * 1.5);
            return;
        }

        const infoAluno = buscarAlunoEmCache(matricula);
        if (!infoAluno) {
            definirStatusLeitura('ERRO');
            definirUltimoAcesso({ mensagem: 'Base local desatualizada.', hora: format(Date.now(), 'HH:mm') });
            setTimeout(() => definirStatusLeitura('AGUARDANDO'), confFila.duracaoFeedbackMs * 1.5);
            return;
        }

        // Pausar reconhecimento facial durante feedback
        if (escola.metodoAcesso === 'FACIAL' && pausarFacial) pausarFacial();

        const movimentoBase: 'ENTRADA' | 'SAIDA' = (tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO)
            ? 'ENTRADA'
            : tipoAcessoAtual as 'ENTRADA' | 'SAIDA';
        const tipoMovimentacao = !escola.saidaObrigatoria ? 'ENTRADA' : movimentoBase;
        const momentoLeituraLocal = Date.now();
        const timestampAjustado = ajustarTimestampLocal(momentoLeituraLocal);

        try {
            const resposta = await servicoSincronizacao.registrarAcesso({
                id: crypto.randomUUID(),
                escola_id: escola.id || '',
                aluno_matricula: matricula,
                tipo_movimentacao: tipoMovimentacao,
                metodo_leitura: metodoLeitura,
                timestamp_acesso: new Date(timestampAjustado).toISOString()
            });

            definirStatusLeitura(resposta.sucesso ? 'SUCESSO' : 'ERRO');
            definirUltimoAcesso({
                aluno: infoAluno,
                mensagem: resposta.sucesso
                    ? (resposta.modo === 'ONLINE' ? 'Acesso Confirmado' : 'Acesso Agendado (Offline)')
                    : 'Erro ao Registrar Acesso',
                hora: format(momentoLeituraLocal, 'HH:mm')
            });

            if (resposta.sucesso && confFila.ttsAtivado) {
                anunciarNome(infoAluno.nome_completo);
            }
            if (resposta.modo === 'OFFLINE') acionarWorker();

        } catch (e) {
            log.error('Erro ao registrar acesso', (e as Error).message);
            definirStatusLeitura('ERRO');
            definirUltimoAcesso({ mensagem: 'Falha tecnica.', hora: format(Date.now(), 'HH:mm') });
        }

        setTimeout(() => {
            definirStatusLeitura('AGUARDANDO');
            if (escola.metodoAcesso === 'FACIAL' && retomarFacial) retomarFacial();
        }, confFila.duracaoFeedbackMs);

    }, [tipoAcessoAtual, confFila, escola, acionarWorker]);

    // ========================================================
    // CALLBACKS para os filhos
    // ========================================================
    const aoIdentificarQR = useCallback((matricula: string) => {
        registrarAcesso(matricula, 'qr_carteirinha');
    }, [registrarAcesso]);

    const aoIdentificarFacial = useCallback((matricula: string) => {
        registrarAcesso(matricula, 'facial');
    }, [registrarAcesso]);

    const aoIdentificarDigital = useCallback((matricula: string) => {
        registrarAcesso(matricula, 'digital');
    }, [registrarAcesso]);

    const aoErroDeteccao = useCallback((mensagem: string) => {
        definirStatusLeitura('ERRO');
        definirUltimoAcesso({ mensagem, hora: format(Date.now(), 'HH:mm') });
        Registrador.registrar(ACOES_AUDITORIA.TENTATIVA_ACESSO_NEGADO, 'controle-acesso', 'quiosque', { mensagem });
        setTimeout(() => definirStatusLeitura('AGUARDANDO'), confFila.duracaoFeedbackMs * 1.5);
    }, [confFila.duracaoFeedbackMs]);

    // ========================================================
    // FILHOS — apenas o do metodo ativo roda
    // ========================================================
    const qr = usarLeitorQRCode({
        elementoId: escola.metodoAcesso === 'QRCODE' ? ELEMENTO_CAMERA_ID : '__desativado_qr__',
        aoIdentificar: aoIdentificarQR,
        aoErro: aoErroDeteccao
    });

    const facial = usarLeitorFacial({
        elementoId: escola.metodoAcesso === 'FACIAL' ? ELEMENTO_CAMERA_ID : '__desativado_facial__',
        escolaId: escola.id,
        cooldownMs: confFila.duracaoFeedbackMs + 2000,
        aoIdentificar: aoIdentificarFacial
    });
    const pausarFacial = facial.pausar;
    const retomarFacial = facial.retomar;

    const digital = usarLeitorDigital({
        elementoId: escola.metodoAcesso === 'DIGITAL' ? ELEMENTO_CAMERA_ID : '__desativado_digital__',
        escolaId: escola.id,
        aoIdentificar: aoIdentificarDigital
    });

    // Status unificado da camera
    const statusCamera = escola.metodoAcesso === 'QRCODE'
        ? qr.statusCamera
        : escola.metodoAcesso === 'FACIAL'
        ? facial.statusCamera
        : digital.statusCamera;

    const corDoDia = '#3b82f6';

    // Icone e label do modo atual
    const iconeMetodo = escola.metodoAcesso === 'FACIAL' ? Eye : escola.metodoAcesso === 'DIGITAL' ? Fingerprint : QrCode;
    const labelMetodo = escola.metodoAcesso === 'FACIAL'
        ? 'RECONHECIMENTO FACIAL ATIVO'
        : escola.metodoAcesso === 'DIGITAL'
        ? 'IDENTIFICACAO DIGITAL ATIVA'
        : 'SCAE PRO FRAMEWORK';
    const mensagemAguardando = escola.metodoAcesso === 'FACIAL'
        ? 'Olhe para a camera para identificacao'
        : escola.metodoAcesso === 'DIGITAL'
        ? 'Apoie o dedo no leitor para identificacao'
        : 'Aproxime o cartao para iniciar a identificacao';

    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden text-slate-900 font-sans selection:bg-blue-100">
            <StatusConexao />

            {/* ===== HEADER ===== */}
            <header className="h-[100px] border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between px-10 md:px-16 z-20 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--cor-primaria)] to-transparent opacity-50"></div>

                <div className="flex items-center gap-8">
                    {escola.logoUrl && (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-[var(--cor-primaria)] blur-2xl opacity-5 group-hover:opacity-15 transition-opacity duration-1000"></div>
                            <div className="relative flex items-center justify-center">
                                <img
                                    src={escola.logoUrl}
                                    alt={escola.nomeEscola}
                                    className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <h1 className="text-2xl md:text-3xl font-[1000] text-slate-900 uppercase tracking-[-0.04em] leading-none">
                            {escola.nomeEscola}
                        </h1>
                        <div className="flex items-center gap-3">
                             <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest hidden sm:inline">
                                {labelMetodo}
                             </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10 lg:gap-14">
                     <div className="text-right hidden md:flex flex-col items-end">
                        <div className="text-3xl lg:text-4xl font-black text-slate-900 leading-none tracking-tighter tabular-nums">
                            {format(dataHora, 'HH:mm:ss')}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 mt-2 flex items-center gap-2">
                            <Clock size={12} strokeWidth={3} className="opacity-50" />
                            {format(dataHora, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </div>
                     </div>

                     <div className="h-12 w-px bg-slate-200/80 hidden md:block"></div>

                     <div className="flex items-center">
                        <StatusConexao />
                     </div>
                </div>
            </header>

            {/* ===== MAIN ===== */}
            <main className="flex-1 flex flex-col lg:flex-row relative p-6 md:p-10 gap-8 lg:gap-12 max-w-[1600px] mx-auto w-full z-10">

                {/* Area da Camera */}
                <div className="flex-[5] flex flex-col items-center justify-center relative">
                    <div className="relative w-full max-w-md aspect-square z-10">
                        <div className="relative h-full bg-white rounded-2xl p-4 shadow-xl border border-slate-200 overflow-hidden">
                            <div className="absolute inset-4 rounded-2xl overflow-hidden bg-slate-50 shadow-inner border border-slate-100 flex items-center justify-center">
                                {/* Container da camera — o filho injeta o video aqui */}
                                <div id={ELEMENTO_CAMERA_ID} className={`w-full h-full object-cover transition-all duration-1000 ${statusCamera !== 'ATIVO' ? 'opacity-0' : 'opacity-100 grayscale-[20%]'}`}></div>

                                {/* Feedbacks de Hardware/Permissao */}
                                {statusCamera === 'INICIALIZANDO' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {escola.metodoAcesso === 'FACIAL' ? 'Carregando IA Facial...' : 'Iniciando Camera...'}
                                        </p>
                                    </div>
                                )}

                                {statusCamera === 'CARREGANDO_MODELOS' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Modelos IA...</p>
                                    </div>
                                )}

                                {statusCamera === 'PERMISSAO_NEGADA' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-8 text-center text-white">
                                        <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mb-6 border border-rose-500/50">
                                            <ShieldCheck size={32} className="text-rose-500" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Acesso Negado</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">O sistema precisa de permissao de camera para funcionar. Autorize nas configuracoes do navegador.</p>
                                    </div>
                                )}

                                {statusCamera === 'SEM_CAMERA' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-20 p-8 text-center">
                                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-6">
                                            <UserX size={32} className="text-slate-400" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-slate-900">Hardware nao encontrado</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Nenhuma camera foi detectada neste dispositivo.</p>
                                    </div>
                                )}

                                {/* HUD — varia por modo */}
                                {statusCamera === 'ATIVO' && (
                                    <div className="absolute inset-8 pointer-events-none z-10 animate-in fade-in duration-1000">
                                        {escola.metodoAcesso === 'FACIAL' ? (
                                            /* Moldura circular para facial */
                                            <>
                                                <div className="absolute inset-4 border-2 border-dashed border-blue-400/40 rounded-full"></div>
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">
                                                    <span className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                                                        <Eye size={10} /> Facial
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            /* Cantos quadrados para QR */
                                            <>
                                                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Linha de Scan (apenas QR) */}
                                {statusLeitura === 'AGUARDANDO' && statusCamera === 'ATIVO' && escola.metodoAcesso === 'QRCODE' && (
                                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite] z-20"></div>
                                )}

                                {/* Badge de alunos cadastrados (apenas Facial) */}
                                {statusCamera === 'ATIVO' && escola.metodoAcesso === 'FACIAL' && facial.totalCadastrados > 0 && (
                                    <div className="absolute bottom-6 inset-x-0 text-center z-20">
                                        <span className="bg-black/50 text-white text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full backdrop-blur-sm">
                                            {facial.totalCadastrados} rostos cadastrados
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Moldura Colorida Diaria */}
                            <div className="absolute inset-0 border-[10px] rounded-2xl pointer-events-none z-0 opacity-10"
                                 style={{ borderColor: corDoDia }}></div>

                            {/* Feedback Fullscreen */}
                            {statusLeitura !== 'AGUARDANDO' && (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all z-30 backdrop-blur-sm
                                    ${confFila.animacoesAtivadas ? 'duration-500 animate-in fade-in zoom-in-105' : 'duration-0'}
                                    ${statusLeitura === 'SUCESSO' ? 'bg-emerald-600/90' : 'bg-rose-600/90'}
                                    `}>
                                    <div className="w-40 h-40 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-2xl">
                                        {statusLeitura === 'SUCESSO'
                                            ? <ShieldCheck size={100} strokeWidth={2.5} className="text-emerald-600" />
                                            : <UserX size={100} strokeWidth={2.5} className="text-rose-600" />
                                        }
                                    </div>
                                    <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                                        {statusLeitura === 'SUCESSO' ? 'OK' : 'OPS'}
                                    </h2>
                                    <p className="text-white font-black text-lg uppercase tracking-[0.5em] mt-10 bg-black/20 px-14 py-6 rounded-full border border-white/10 backdrop-blur-xl">
                                        {ultimoAcesso?.mensagem}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== SIDEBAR ===== */}
                <aside className="w-full lg:w-[400px] shrink-0">
                    <div className="h-full bg-white rounded-2xl border border-slate-200 p-8 flex flex-col shadow-sm relative overflow-hidden">
                        <div className="flex-1 flex flex-col justify-center py-6">
                            {ultimoAcesso?.aluno ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                                    <div className="text-center relative">
                                        <div className="w-28 h-28 rounded-2xl bg-slate-100 border-2 border-white flex items-center justify-center mx-auto mb-8 shadow-lg overflow-hidden group">
                                            <div className="w-full h-full bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center">
                                                <User size={56} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter px-4 leading-[0.9]">
                                            {ultimoAcesso.aluno.nome_completo}
                                        </h2>
                                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-10">
                                            Matricula {ultimoAcesso.aluno.matricula}
                                        </p>

                                        <div className="bg-slate-900 text-white px-10 py-5 rounded-[24px] inline-flex items-center gap-4 shadow-3xl hover:translate-y-[-2px] transition-transform">
                                            <ShieldCheck size={24} className="text-emerald-400" strokeWidth={3} />
                                            <div className="text-left leading-none">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Turma Selecionada</p>
                                                <p className="text-xl font-black uppercase tracking-tighter">{ultimoAcesso.aluno.turma_id}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50">
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Horario</p>
                                            <p className="text-sm font-black text-slate-700">{ultimoAcesso.hora}</p>
                                        </div>
                                        <div className={`p-4 border rounded-2xl text-center ${statusLeitura === 'SUCESSO' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1">Status</p>
                                            <p className="text-xs font-black uppercase tracking-tighter">{statusLeitura === 'SUCESSO' ? 'OK' : 'OPS'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-8 opacity-20">
                                    <div className="w-40 h-40 border-4 border-dashed border-slate-200 rounded-[50px] mx-auto flex items-center justify-center">
                                        {escola.metodoAcesso === 'FACIAL'
                                            ? <Eye size={80} strokeWidth={1} className="text-slate-300" />
                                            : escola.metodoAcesso === 'DIGITAL'
                                            ? <Fingerprint size={80} strokeWidth={1} className="text-slate-300" />
                                            : <QrCode size={80} strokeWidth={1} className="text-slate-300" />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.6em] text-slate-500 mb-2 leading-none">Sincronizado</p>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase max-w-[200px] mx-auto">
                                            {mensagemAguardando}
                                         </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

            </main>

            {/* Estilos Globais HUD */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .shadow-3xl {
                    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.15);
                }
                .shadow-4xl {
                    box-shadow: 0 60px 120px -20px rgba(0,0,0,0.25);
                }
            ` }} />
        </div>
    );
}
