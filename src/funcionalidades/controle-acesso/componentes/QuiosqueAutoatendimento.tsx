import { useState, useCallback, useEffect, useMemo } from 'react';
import { ptBR } from 'date-fns/locale';
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
    const [dataHora, definirDataHora] = useState(new Date());

    // Relógio em tempo real - Atualização visual não deve quebrar o back-end
    useEffect(() => {
        const timer = setInterval(() => definirDataHora(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!escola.id) return;
        obterChavePublica(escola.id).catch(e => log.error('Falha ao obter chave pública', (e as Error).message));
    }, [escola.id]);

    const lancarErroValidacao = useCallback((mensagem: string, hookRestart: () => void) => {
        definirStatusLeitura('ERRO');
        definirUltimoAcesso({
            mensagem,
            hora: format(Date.now(), 'HH:mm')
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
    }, [confFila.duracaoFeedbackMs]);

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

            // Validação Temporal (Anti-Print / Anti-Foto)
            const agora = ajustarTimestampLocal(Date.now());
            const emissaoMs = parseInt(timestampEmissao) * 1000;
            const idadeSegundos = Math.floor((agora - emissaoMs) / 1000);

            if (escola.qrDinamico && idadeSegundos > 25) { // 15s + 10s de tolerância
                lancarErroValidacao("QR Expirado. Use o app original.", retomarCamera);
                return;
            }

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

            const resposta = await servicoSincronizacao.registrarAcesso({
                id: crypto.randomUUID(),
                escola_id: escola.id || '',
                aluno_matricula: matricula,
                tipo_movimentacao: tipoMovimentacao,
                metodo_leitura: 'qr_carteirinha',
                timestamp_acesso: new Date(timestampAjustado).toISOString()
            });

            definirStatusLeitura(resposta.sucesso ? 'SUCESSO' : 'ERRO');
            definirUltimoAcesso({
                aluno: infoAluno,
                mensagem: resposta.sucesso
                    ? (resposta.modo === 'ONLINE' ? 'Acesso Confirmado Cloud' : 'Acesso Agendado (Offline)')
                    : 'Erro ao Registrar Acesso',
                hora: format(momentoLeituraLocal, 'HH:mm')
            });

            if (resposta.sucesso && confFila.ttsAtivado) {
                anunciarNome(infoAluno.nome_completo);
            }

            if (resposta.modo === 'OFFLINE') acionarWorker();

            retomarCamera();
            setTimeout(() => definirStatusLeitura('AGUARDANDO'), confFila.duracaoFeedbackMs);

        } catch (e) {
            log.error('Erro na leitura do QR offline', (e as Error).message);
            lancarErroValidacao("Falha técnica no núcleo.", retomarCamera);
        }
    }, [tipoAcessoAtual, confFila, escola.id, acionarWorker, lancarErroValidacao]);

    const { statusLeitor } = usarLeitorQR('quiosque-camera', processarDecodificacao);

    const corDoDia = '#3b82f6'; // Azul institucional discreto

    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden text-slate-900 font-sans selection:bg-blue-100">
            <StatusConexao />

            {/* Cabeçalho Institucional de Alta Performance */}
            <header className="h-[100px] border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between px-10 md:px-16 z-20 shrink-0 relative overflow-hidden">
                {/* Linha de Identidade Institucional Superior */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--cor-primaria)] to-transparent opacity-50"></div>
                
                <div className="flex items-center gap-8">
                    {/* Logo Section com Glow Sutil */}
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
                             <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest hidden sm:inline">SCAE OS Framework</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10 lg:gap-14">
                     {/* Relógio Digital e Data Localizada */}
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

                     {/* Status Integrado Minimalista */}
                     <div className="flex items-center">
                        <StatusConexao />
                     </div>
                </div>
            </header>

            {/* Layout Principal - Foco em Funcionalidade */}
            <main className="flex-1 flex flex-col lg:flex-row relative p-6 md:p-10 gap-8 lg:gap-12 max-w-[1600px] mx-auto w-full z-10">
                
                {/* Setor de Leitura Padrão Quadrado */}
                <div className="flex-[5] flex flex-col items-center justify-center relative">
                    {/* Moldura de Câmera Quadrada */}
                    <div className="relative w-full max-w-md aspect-square z-10">
                        <div className="relative h-full bg-white rounded-2xl p-4 shadow-xl border border-slate-200 overflow-hidden">
                            <div className="absolute inset-4 rounded-xl overflow-hidden bg-slate-50 shadow-inner border border-slate-100 flex items-center justify-center">
                                {/* Camera */}
                                <div id="quiosque-camera" className={`w-full h-full object-cover transition-all duration-1000 ${statusLeitor !== 'ATIVO' ? 'opacity-0' : 'opacity-100 grayscale-[20%] group-hover:grayscale-0'}`}></div>
                                
                                {/* Feedbacks de Hardware/Permissão */}
                                {statusLeitor === 'INICIALIZANDO' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
                                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciando Câmera...</p>
                                    </div>
                                )}

                                {statusLeitor === 'PERMISSAO_NEGADA' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-8 text-center text-white">
                                        <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mb-6 border border-rose-500/50">
                                            <ShieldCheck size={32} className="text-rose-500" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Acesso Negado</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">O sistema precisa de permissão de câmera para funcionar. Por favor, autorize nas configurações do seu navegador.</p>
                                    </div>
                                )}

                                {statusLeitor === 'SEM_CAMERA' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-20 p-8 text-center">
                                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-6">
                                            <UserX size={32} className="text-slate-400" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-slate-900">Hardware não encontrado</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Nenhuma câmera foi detectada neste dispositivo. Verifique a conexão do hardware.</p>
                                    </div>
                                )}

                                {/* HUD Minimalista Quadrado */}
                                {statusLeitor === 'ATIVO' && (
                                    <div className="absolute inset-8 pointer-events-none z-10 animate-in fade-in duration-1000">
                                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                                    </div>
                                )}

                                {/* Linha de Scan Estilizada */}
                                {statusLeitura === 'AGUARDANDO' && statusLeitor === 'ATIVO' && (
                                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite] z-20"></div>
                                )}
                            </div>

                            {/* Moldura Colorida Diária */}
                            <div className="absolute inset-0 border-[10px] rounded-2xl pointer-events-none z-0 opacity-10" 
                                 style={{ borderColor: corDoDia }}></div>

                            {/* Feedback Fullscreen Refinado */}
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


                {/* Painel de Informação Lateral */}
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

                                    <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50">
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Horário</p>
                                            <p className="text-sm font-black text-slate-700">{ultimoAcesso.hora}</p>
                                        </div>
                                        <div className={`p-4 border rounded-xl text-center ${statusLeitura === 'SUCESSO' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1">Status</p>
                                            <p className="text-xs font-black uppercase tracking-tighter">{statusLeitura === 'SUCESSO' ? 'OK' : 'OPS'}</p>
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
