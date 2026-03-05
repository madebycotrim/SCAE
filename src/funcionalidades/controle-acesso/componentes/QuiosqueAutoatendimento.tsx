import { useState, useCallback, useEffect } from 'react';
import type { DadosAluno } from '../servicos/cacheMemoria';

interface FeedbackAcesso {
    aluno?: DadosAluno;
    mensagem: string;
    hora: string;
}
import { usarEscola } from '@escola/ProvedorEscola';
import { usarInstalacaoPWA } from '@compartilhado/hooks/usarInstalacaoPWA';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarTipoAcesso } from '../hooks/usarTipoAcesso';
import { usarModoFila } from '../hooks/usarModoFila';
import { usarLeitorQR } from '../hooks/usarLeitorQR';
import { usarControleAcessoWorker } from '../hooks/usarControleAcessoWorker';
import { hubSincronizacao } from '@compartilhado/servicos/hubSincronizacao';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { obterChavePublica, verificarAssinaturaECDSA } from '../utils/validarQR';
import { anunciarNome } from '../utils/anunciarNome';
import { buscarAlunoEmCache, alunoEstaRevogado } from '../servicos/cacheMemoria';
import { Registrador, ACOES_AUDITORIA } from '@compartilhado/servicos/auditoria';
import { TIPO_ACESSO, TipoAcesso } from '../types/controleAcesso.tipos';
import { StatusConexao } from './StatusConexao';
import { format } from 'date-fns';
import { ShieldCheck, UserX, ScanLine, Zap, Clock, Radar, Fingerprint, Download, Smartphone } from 'lucide-react';
import { CartaoConteudo } from '@compartilhado/componentes/UI';

const log = criarRegistrador('ControleAcesso:Quiosque');

export default function QuiosqueAutoatendimento() {
    const escola = usarEscola();
    const { usuarioAtual } = usarAutenticacao();
    const tipoAcessoAtual = usarTipoAcesso();
    const confFila = usarModoFila();
    const { acionarWorker, statusWorker } = usarControleAcessoWorker();
    const { podeInstalar, instalarApp } = usarInstalacaoPWA();

    const [ultimoAcesso, definirUltimoAcesso] = useState<FeedbackAcesso | null>(null);
    const [statusLeitura, definirStatusLeitura] = useState<'AGUARDANDO' | 'SUCESSO' | 'ERRO'>('AGUARDANDO');

    useEffect(() => {
        obterChavePublica().catch(e => log.error('Falha ao obter chave pública', e));
    }, []);

    const processarDecodificacao = useCallback(async (
        textoDecodificado: string,
        pararCamera: () => void,
        retomarCamera: () => void
    ) => {
        pararCamera();

        try {
            const partesQR = textoDecodificado.split('|');
            if (partesQR.length !== 3) {
                lancarErroValidacao("QR Code Incompatível.", retomarCamera);
                return;
            }

            const [matricula, timestampEmissao, assinatura] = partesQR;
            const payloadAssinado = `${matricula}|${timestampEmissao}`;

            const pk = await obterChavePublica();
            const chaveValida = await verificarAssinaturaECDSA(payloadAssinado, assinatura, pk);

            if (!chaveValida) {
                lancarErroValidacao("Crachá não autenticado.", retomarCamera);
                return;
            }

            if (alunoEstaRevogado(matricula)) {
                lancarErroValidacao("Acesso Revogado.", retomarCamera);
                return;
            }

            const infoAluno = buscarAlunoEmCache(matricula);
            if (!infoAluno) {
                lancarErroValidacao("Base local desatualizada.", retomarCamera);
                return;
            }

            const tipoMovimentacao: 'ENTRADA' | 'SAIDA' = (tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO) ? 'ENTRADA' : tipoAcessoAtual as 'ENTRADA' | 'SAIDA';
            const momentoLeituraLocal = Date.now();
            const timestampAjustado = ajustarTimestampLocal(momentoLeituraLocal);

            // 5. Registrar no HUB Sincronização (Inteligente: Tenta Online -> Fallback Local)
            const resposta = await hubSincronizacao.registrarAcesso({
                id: crypto.randomUUID(),
                escola_id: escola.id || '',
                aluno_matricula: matricula,
                tipo_movimentacao: tipoMovimentacao,
                metodo_leitura: 'qr_carteirinha',
                timestamp_acesso: new Date(timestampAjustado).toISOString()
            });

            // 6. Feedback Visual e Sonoro
            definirStatusLeitura(resposta.sucesso ? 'SUCESSO' : 'ERRO');
            definirUltimoAcesso({
                aluno: infoAluno,
                mensagem: resposta.sucesso
                    ? (resposta.modo === 'ONLINE' ? 'Acesso Confirmado Cloud' : 'Acesso Agendado (Offline)')
                    : 'Erro ao Registrar Acesso',
                hora: format(momentoLeituraLocal, 'HH:mm:ss')
            });

            if (resposta.sucesso && confFila.ttsAtivado) {
                anunciarNome(infoAluno.nome_completo);
            }

            // Cutuca o worker se foi offline
            if (resposta.modo === 'OFFLINE') {
                acionarWorker();
            }

            retomarCamera();

            setTimeout(() => {
                definirStatusLeitura('AGUARDANDO');
            }, confFila.duracaoFeedbackMs);

        } catch (e) {
            log.error('Erro na leitura do QR offline', (e as Error).message);
            lancarErroValidacao("Falha técnica no núcleo.", retomarCamera);
        }
    }, [tipoAcessoAtual, confFila, escola.id, acionarWorker]);

    const lancarErroValidacao = (mensagem: string, hookRestart: () => void) => {
        definirStatusLeitura('ERRO');
        definirUltimoAcesso({
            mensagem,
            hora: format(Date.now(), 'HH:mm:ss')
        });

        Registrador.registrar(
            mensagem.includes('ECDSA') ? ACOES_AUDITORIA.QR_CODE_INVALIDO : ACOES_AUDITORIA.TENTATIVA_ACESSO_NEGADO,
            'controle-acesso',
            'quiosque-autoatendimento',
            { mensagem }
        );

        hookRestart();

        setTimeout(() => {
            definirStatusLeitura('AGUARDANDO');
        }, confFila.duracaoFeedbackMs * 1.5);
    }

    usarLeitorQR('quiosque-camera', processarDecodificacao);

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden text-slate-100 font-sans selection:bg-indigo-500">
            {/* HUD / Background effects matching TerminalAcesso */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>

            <StatusConexao />

            {/* Header High-Tech */}
            <header className="h-[80px] border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 z-20 shadow-2xl shrink-0">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center border border-indigo-500 shadow-xl shadow-indigo-900/40">
                        <ScanLine size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                                {escola?.nomeEscola || 'SCAE UNIT'}
                            </h1>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[8px] font-black rounded border border-white/5 uppercase tracking-widest">AUTOATENDIMENTO</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1.5">Terminal de Acesso do Aluno</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {podeInstalar && (
                        <button
                            onClick={instalarApp}
                            className="group/install flex items-center gap-3 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl border border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 z-30"
                        >
                            <Download size={18} className="group-hover/install:animate-bounce" />
                            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Instalar App</span>
                        </button>
                    )}

                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : tipoAcessoAtual === TIPO_ACESSO.SAIDA
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_12px_currentColor] ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                        {tipoAcessoAtual === TIPO_ACESSO.ENTRADA && 'MODO: ENTRADA'}
                        {tipoAcessoAtual === TIPO_ACESSO.SAIDA && 'MODO: SAÍDA'}
                        {tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO && 'MODO: LEITURA'}
                    </div>

                    <div className="text-right hidden sm:block border-l border-white/10 pl-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Logado como</p>
                        <p className="text-xs font-black text-white leading-tight uppercase tracking-tight">{usuarioAtual?.email?.split('@')[0]}</p>
                    </div>
                </div>
            </header>

            {/* Main Tablet Content Area - High Impact */}
            <main className="flex-1 flex flex-col lg:flex-row relative p-8 gap-8 max-w-[1600px] mx-auto w-full overflow-hidden z-10">

                {/* Industrial Imaging Sector */}
                <CartaoConteudo className="flex-[5] flex flex-col items-center justify-center p-12 bg-slate-900/40 border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

                    <div className="text-center space-y-3 mb-12">
                        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.5em] flex items-center justify-center gap-3">
                            <Radar size={18} className="animate-spin-slow" /> Pronto para ler
                        </h2>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Aproxime sua Carteirinha</h3>
                    </div>

                    {/* Heavy Duty Frame */}
                    <div className="relative w-full max-w-2xl aspect-[16/10] bg-black rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.8)] flex items-center justify-center ring-1 ring-white/5 group-hover:ring-indigo-500/20 transition-all duration-700">

                        {/* Camera Core */}
                        <div id="quiosque-camera" className="w-full h-full object-cover scale-[1.05] grayscale opacity-70 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-1000"></div>

                        {/* Scanner HUD Overlay */}
                        <div className="absolute inset-10 border border-white/5 rounded-3xl pointer-events-none z-10 flex flex-col justify-between p-6 overflow-hidden">
                            <div className="flex justify-between">
                                <div className="w-10 h-10 border-t-4 border-l-4 border-white/20 rounded-tl-2xl"></div>
                                <div className="w-10 h-10 border-t-4 border-r-4 border-white/20 rounded-tr-2xl"></div>
                            </div>

                            {/* Central Laser Line */}
                            {confFila.animacoesAtivadas && statusLeitura === 'AGUARDANDO' && (
                                <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_20px_#6366f1] animate-[varredura_2.5s_infinite]"></div>
                            )}

                            <div className="flex justify-between">
                                <div className="w-10 h-10 border-b-4 border-l-4 border-white/20 rounded-bl-2xl"></div>
                                <div className="w-10 h-10 border-b-4 border-r-4 border-white/20 rounded-br-2xl"></div>
                            </div>
                        </div>

                        {/* Fullscreen Feedback Overlay with Backdrop Blur */}
                        {statusLeitura !== 'AGUARDANDO' && (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all z-20 backdrop-blur-3xl 
                                ${confFila.animacoesAtivadas ? 'duration-500 animate-in fade-in zoom-in-95' : 'duration-0'} 
                                ${statusLeitura === 'SUCESSO' ? 'bg-emerald-600/90' : 'bg-rose-600/90'}
                                `}>
                                <div className="w-48 h-48 rounded-[3rem] bg-white flex items-center justify-center mb-10 shadow-2xl animate-bounce">
                                    {statusLeitura === 'SUCESSO'
                                        ? <ShieldCheck size={100} strokeWidth={2.5} className="text-emerald-600" />
                                        : <UserX size={100} strokeWidth={2.5} className="text-rose-600" />
                                    }
                                </div>
                                <h2 className="text-7xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                                    {statusLeitura === 'SUCESSO' ? 'Liberado' : 'Negado'}
                                </h2>
                                <p className="text-white font-black text-xl uppercase tracking-[0.3em] mt-6 bg-black/20 px-10 py-3 rounded-full border border-white/10">
                                    {ultimoAcesso?.mensagem}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 text-center opacity-40 uppercase tracking-[0.3em] font-black text-[10px] text-slate-500">
                        O leitor está ativo. Aproxime seu QR Code para entrar ou sair.
                    </div>
                </CartaoConteudo>

                {/* Real-time Event Sidebar */}
                <CartaoConteudo className="w-full lg:w-[480px] p-10 flex flex-col bg-slate-900 border-white/10 shadow-2xl relative overflow-hidden group/side">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>

                    <h3 className="text-xs font-black text-slate-400 flex items-center gap-3 pb-6 border-b border-white/5 mb-10 uppercase tracking-[0.2em] z-10 relative">
                        <Zap size={20} className="text-amber-500 animate-pulse" />
                        Último Acesso
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar z-10 relative">
                        {ultimoAcesso ? (
                            <div className="space-y-10 animate-in slide-in-from-right-10 duration-500">
                                {ultimoAcesso.aluno && (
                                    <div className="bg-white/5 rounded-2xl p-10 border border-white/10 text-center relative overflow-hidden backdrop-blur-3xl shadow-2xl group-hover/side:border-indigo-500/30 transition-all">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 text-white/30 border border-white/5">
                                            <Fingerprint size={32} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter leading-tight">
                                            {ultimoAcesso.aluno.nome_completo}
                                        </h2>
                                        <p className="text-[10px] font-mono font-black text-slate-500 mb-8 uppercase tracking-[0.3em] italic">
                                            Matrícula: {ultimoAcesso.aluno.matricula}
                                        </p>

                                        <div className="inline-flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black border border-indigo-400/50 shadow-xl shadow-indigo-900/40 uppercase tracking-widest leading-none">
                                            <ShieldCheck size={18} strokeWidth={2.5} /> {ultimoAcesso.aluno.turma_id}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all shadow-xl ${statusLeitura === 'SUCESSO' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Resultado</span>
                                        <div className="text-[10px] font-black flex items-center gap-3 uppercase tracking-widest whitespace-nowrap">
                                            {statusLeitura === 'SUCESSO' ? <ShieldCheck size={20} strokeWidth={2.5} /> : <UserX size={20} strokeWidth={2.5} />}
                                            {ultimoAcesso.mensagem}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</span>
                                        <div className="text-sm font-mono font-black text-slate-300 flex items-center gap-3">
                                            <Clock size={18} className="text-slate-600" />
                                            {ultimoAcesso.hora}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-8 opacity-20 group-hover/side:opacity-40 transition-opacity">
                                <div className="w-32 h-32 rounded-[3rem] border-2 border-dashed border-slate-700 flex items-center justify-center relative bg-slate-800/20">
                                    <ScanLine size={48} className="animate-pulse" />
                                </div>
                                <p className="text-[10px] font-black text-center uppercase tracking-[0.5em] max-w-[200px] leading-loose">
                                    AGUARDANDO LEITURA
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Operational Guardrails */}
                    <div className="pt-8 border-t border-white/5 flex items-center justify-between z-10 relative">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sistema Online</span>
                        </div>
                        <p className="text-[10px] font-mono font-black text-indigo-400/40 uppercase tracking-widest">
                            {statusWorker.pendentes > 0 ? `SINCRONIZANDO: ${statusWorker.pendentes}` : 'SISTEMA OK'}
                        </p>
                    </div>
                </CartaoConteudo>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes varredura {
                    0% { top: 0% }
                    50% { top: 100% }
                    100% { top: 0% }
                }
                .animate-spin-slow {
                    animation: spin 10s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg) }
                    to { transform: rotate(360deg) }
                }
            ` }} />
        </div>
    );
}
