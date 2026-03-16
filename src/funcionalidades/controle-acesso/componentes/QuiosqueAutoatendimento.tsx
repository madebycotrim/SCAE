import { useState, useCallback, useEffect } from 'react';
import type { DadosAluno } from '../servicos/cacheMemoria';

interface FeedbackAcesso {
    aluno?: DadosAluno;
    mensagem: string;
    hora: string;
}
import { usarEscola } from '@/escola/ProvedorEscola';
import { usarInstalacaoPWA } from '@/compartilhado/hooks/usarInstalacaoPWA';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { usarTipoAcesso } from '../hooks/usarTipoAcesso';
import { usarModoFila } from '../hooks/usarModoFila';
import { usarLeitorQR } from '../hooks/usarLeitorQR';
import { usarControleAcessoWorker } from '../hooks/usarControleAcessoWorker';
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { obterChavePublica, verificarAssinaturaECDSA } from '../utils/validarQR';
import { anunciarNome } from '../utils/anunciarNome';
import { buscarAlunoEmCache, alunoEstaRevogado } from '../servicos/cacheMemoria';
import { Registrador, ACOES_AUDITORIA } from '@/compartilhado/servicos/auditoria';
import { TIPO_ACESSO, TipoAcesso } from '../types/controleAcesso.tipos';
import { StatusConexao } from './StatusConexao';
import { format } from 'date-fns';
import { ShieldCheck, UserX, ScanLine, Zap, Clock, Radar, Fingerprint, Download, Smartphone, User } from 'lucide-react';
import { CartaoConteudo } from '@/compartilhado/componentes/UI';

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
        if (!escola.id) return;
        obterChavePublica(escola.id).catch(e => log.error('Falha ao obter chave pública', e));
    }, [escola.id]);

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

            const pk = await obterChavePublica(escola.id);
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
            const resposta = await servicoSincronizacao.registrarAcesso({
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

    const corDoDia = '#3b82f6'; // Azul institucional discreto

    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden text-slate-900 font-sans selection:bg-blue-100">
            <StatusConexao />

            {/* Cabeçalho Institucional Premium */}
            <header className="h-[90px] border-b border-slate-200 bg-white flex items-center justify-between px-8 md:px-12 z-20 shrink-0 shadow-sm relative">
                <div className="flex items-center gap-6">
                    {escola.logoUrl ? (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center">
                            <img src={escola.logoUrl} alt={escola.nomeEscola} className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <ScanLine size={32} strokeWidth={2} />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                            {escola?.nomeEscola || 'SCAE - Sistema de Acesso'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Status de Conexão Integrado */}
                    <div className="hidden sm:block">
                        <StatusConexao />
                    </div>
                </div>
            </header>

            {/* Layout Principal - Foco em Funcionalidade */}
            <main className="flex-1 flex flex-col lg:flex-row relative p-6 md:p-10 gap-8 lg:gap-12 max-w-[1600px] mx-auto w-full z-10">
                
                {/* Setor de Leitura Zen */}
                <div className="flex-[5] flex flex-col items-center justify-center relative">
                    {/* Moldura de Câmera Essencial */}
                    <div className="relative w-full max-w-2xl aspect-[16/10] z-10">
                        {/* Sombra de Profundidade */}
                        <div className="absolute inset-10 bg-blue-600/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        
                        <div className="relative h-full bg-white rounded-[48px] p-5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden transform transition-all duration-700 hover:scale-[1.02] hover:shadow-[0_60px_130px_-20px_rgba(0,0,0,0.18)]">
                            <div className="absolute inset-5 rounded-[32px] overflow-hidden bg-slate-50 shadow-inner border border-slate-100/50">
                                {/* Camera */}
                                <div id="quiosque-camera" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-1000"></div>
                                
                                {/* HUD Minimalista de Cantos */}
                                <div className="absolute inset-10 pointer-events-none z-10">
                                    <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white/40 rounded-tl-3xl"></div>
                                    <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white/40 rounded-tr-3xl"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white/40 rounded-bl-3xl"></div>
                                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white/40 rounded-br-3xl"></div>
                                </div>

                                {/* Linha de Scan Estilizada */}
                                {statusLeitura === 'AGUARDANDO' && (
                                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite] z-20"></div>
                                )}
                            </div>

                            {/* Moldura Colorida Diária (Sutil) */}
                            <div className="absolute inset-0 border-[16px] rounded-[48px] pointer-events-none z-0 opacity-5" 
                                 style={{ borderColor: corDoDia }}></div>

                            {/* Feedback Fullscreen Refinado */}
                            {statusLeitura !== 'AGUARDANDO' && (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all z-30 backdrop-blur-sm
                                    ${confFila.animacoesAtivadas ? 'duration-500 animate-in fade-in zoom-in-105' : 'duration-0'} 
                                    ${statusLeitura === 'SUCESSO' ? 'bg-emerald-600/90' : 'bg-rose-600/90'}
                                    `}>
                                    <div className="w-48 h-48 rounded-[40px] bg-white flex items-center justify-center mb-10 shadow-4xl animate-bounce">
                                        {statusLeitura === 'SUCESSO'
                                            ? <ShieldCheck size={120} strokeWidth={2.5} className="text-emerald-600" />
                                            : <UserX size={120} strokeWidth={2.5} className="text-rose-600" />
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


                {/* Painel de Informação Lateral */}
                <aside className="w-full lg:w-[420px] shrink-0">
                    <div className="h-full bg-white rounded-[40px] border border-slate-200 p-10 flex flex-col shadow-sm relative overflow-hidden">
                        
                        <div className="flex-1 flex flex-col justify-center py-6">
                            {ultimoAcesso?.aluno ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                                    <div className="text-center relative">
                                        <div className="w-32 h-32 rounded-[40px] bg-slate-100 border-4 border-white flex items-center justify-center mx-auto mb-8 shadow-2xl overflow-hidden group">
                                            <div className="w-full h-full bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center">
                                                <User size={64} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter px-4 leading-[0.9]">
                                            {ultimoAcesso.aluno.nome_completo}
                                        </h2>
                                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-10">
                                            Matrícula {ultimoAcesso.aluno.matricula}
                                        </p>
                                        
                                        <div className="bg-slate-900 text-white px-10 py-5 rounded-[24px] inline-flex items-center gap-4 shadow-3xl hover:translate-y-[-2px] transition-transform">
                                            <ShieldCheck size={24} className="text-emerald-400" strokeWidth={3} />
                                            <div className="text-left leading-none">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Turma Selecionada</p>
                                                <p className="text-xl font-black uppercase tracking-tighter">{ultimoAcesso.aluno.turma_id}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-10 border-t border-slate-50">
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[28px] text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Horário</p>
                                            <p className="text-base font-black text-slate-700">{ultimoAcesso.hora}</p>
                                        </div>
                                        <div className={`p-6 border rounded-[28px] text-center ${statusLeitura === 'SUCESSO' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-2">Verificação</p>
                                            <p className="text-xs font-black uppercase tracking-tighter">{statusLeitura === 'SUCESSO' ? 'Aprovado' : 'Falhou'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-8 opacity-20">
                                    <div className="w-40 h-40 border-4 border-dashed border-slate-200 rounded-[50px] mx-auto flex items-center justify-center">
                                        <Fingerprint size={80} strokeWidth={1} className="text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.6em] text-slate-500 mb-2 leading-none">Sincronizado</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase max-w-[200px] mx-auto">Aproxime o cartão para iniciar a identificação</p>
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
