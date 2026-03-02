/**
 * TelaQuiosque — Tela principal do tablet (fullscreen, sem navbar, sem menus).
 *
 * Integra com as restrições Offline-first: Html5Qrcode otimizado, TTS assíncrono,
 * Clock drift protection e Gravação persistente no IndexedDB.
 */
import { useState, useCallback, useEffect } from 'react';
import type { DadosAluno } from '../servicos/cacheMemoria';

interface FeedbackAcesso {
    aluno?: DadosAluno;
    mensagem: string;
    hora: string;
}
import { usarTenant } from '@tenant/provedorTenant';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarTipoAcesso } from '../hooks/usarTipoAcesso';
import { usarModoFila } from '../hooks/usarModoFila';
import { usarLeitorQR } from '../hooks/usarLeitorQR';
import { usarPortariaWorker } from '../hooks/usarPortariaWorker';
import { filaOffline, RegistroOffline } from '../servicos/filaOffline.service';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { obterChavePublica, verificarAssinaturaECDSA } from '../utils/validarQR';
import { anunciarNome } from '../utils/anunciarNome';
import { buscarAlunoEmCache, alunoEstaRevogado } from '../servicos/cacheMemoria';
import { Registrador, ACOES_AUDITORIA } from '@compartilhado/servicos/auditoria';
import { TIPO_ACESSO, TipoAcesso } from '../types/portaria.tipos';
import { StatusConexao } from './StatusConexao';
import { format } from 'date-fns';
import { ShieldCheck, UserX, ScanLine, Zap, Clock } from 'lucide-react';

const log = criarRegistrador('Quiosque');

export default function TelaQuiosque() {
    const tenant = usarTenant();
    const { usuarioAtual } = usarAutenticacao();
    const tipoAcessoAtual = usarTipoAcesso();
    const confFila = usarModoFila();
    const { acionarWorker, statusWorker } = usarPortariaWorker();

    const [ultimoAcesso, definirUltimoAcesso] = useState<FeedbackAcesso | null>(null);
    const [statusLeitura, definirStatusLeitura] = useState<'AGUARDANDO' | 'SUCESSO' | 'ERRO'>('AGUARDANDO');

    // Inicializa carregamento da PK ECDSA no boot do Tablet
    useEffect(() => {
        obterChavePublica().catch(e => log.error('Falha ao obter chave pública', e));
    }, []);

    const processarDecodificacao = useCallback(async (
        textoDecodificado: string,
        pararCamera: () => void,
        retomarCamera: () => void
    ) => {
        pararCamera(); // Pausa o sensor imediatamente (Evita engarrafamento de CPU)

        try {
            // O Payload hipotético do QR: "matricula|timestamp|assinatura_b64"
            const partesQR = textoDecodificado.split('|');

            // Caso QR inválido visualmente:
            if (partesQR.length !== 3) {
                lancarErroValidacao("QR Code Incompatível com o Sistema.", retomarCamera);
                return;
            }

            const [matricula, timestampEmissao, assinatura] = partesQR;
            const payloadAssinado = `${matricula}|${timestampEmissao}`;

            const pk = await obterChavePublica();
            const chaveValida = await verificarAssinaturaECDSA(payloadAssinado, assinatura, pk);

            if (!chaveValida) {
                lancarErroValidacao("Crachá falsificado (ECDSA Incorreta).", retomarCamera);
                return;
            }

            // O(1) Cache Memoria Sem I/O de disco
            if (alunoEstaRevogado(matricula)) {
                lancarErroValidacao("Crachá revogado ou bloqueado.", retomarCamera);
                return;
            }

            const infoAluno = buscarAlunoEmCache(matricula);
            if (!infoAluno) {
                lancarErroValidacao("Aluno não consta na base local atualizada.", retomarCamera);
                return;
            }

            const tipoMovimentacao: TipoAcesso = (tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO)
                ? 'ENTRADA' // Fallback para Manual entry posteriormente 
                : tipoAcessoAtual as TipoAcesso;

            const momentoLeituraLocal = Date.now();

            // Fila IndexedDB
            const eventoId = crypto.randomUUID();
            const logIdempotente: RegistroOffline = {
                id: eventoId,
                tenantId: tenant.id,
                alunoMatricula: matricula,
                tipoMovimentacao: tipoMovimentacao as 'ENTRADA' | 'SAIDA',
                metodoLeitura: 'qr_carteirinha',
                timestampLocal: momentoLeituraLocal,
                timestampAjustado: ajustarTimestampLocal(momentoLeituraLocal),
                sincronizado: false,
            };

            await filaOffline.enfileirarRegistro(logIdempotente);
            acionarWorker(); // Acorda a thread de fundo (se pausada)

            if (confFila.ttsAtivado) {
                anunciarNome(infoAluno.nome_completo);
            }

            definirStatusLeitura('SUCESSO');
            definirUltimoAcesso({
                aluno: infoAluno,
                mensagem: (tipoMovimentacao === 'ENTRADA') ? 'Entrada Registrada' : 'Saída Registrada',
                hora: format(momentoLeituraLocal, 'HH:mm:ss')
            });

            // Reiniciar Câmera instantaneamente com Feedback na Tela rodando paralelamente
            retomarCamera();

            // Desapagar Painel de Resultado baseando-se no Modo de Fila
            setTimeout(() => {
                definirStatusLeitura('AGUARDANDO');
            }, confFila.duracaoFeedbackMs);

        } catch (e) {
            log.error('Erro na leitura do QR offline', (e as Error).message);
            lancarErroValidacao("Falha técnica no processamento do Qr Code.", retomarCamera);
        }
    }, [tipoAcessoAtual, confFila, tenant.id]);

    const lancarErroValidacao = (mensagem: string, hookRestart: () => void) => {
        definirStatusLeitura('ERRO');
        definirUltimoAcesso({
            mensagem,
            hora: format(Date.now(), 'HH:mm:ss')
        });

        // Registrar Auditoria de Segurança (LGPD #8)
        Registrador.registrar(
            mensagem.includes('ECDSA') ? ACOES_AUDITORIA.QR_CODE_INVALIDO : ACOES_AUDITORIA.TENTATIVA_ACESSO_NEGADO,
            'portaria',
            'quiosque-tablet',
            { mensagem }
        );

        hookRestart(); // Retorna o funcionamento

        setTimeout(() => {
            definirStatusLeitura('AGUARDANDO');
        }, confFila.duracaoFeedbackMs * 1.5); // Demora mais quando erra para porteiro ler
    }

    // Instanciação Pura (Sobe em Loop Câmera ao dar mount)
    usarLeitorQR('quiosque-camera', processarDecodificacao);

    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden text-slate-900 font-sans">
            <StatusConexao />

            {/* Header / Top Bar */}
            <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                        <ScanLine size={24} className="text-slate-700" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {tenant?.nomeEscola || 'SCAE'} <span className="text-slate-400 font-medium">| Quiosque de Autoatendimento</span>
                        </h1>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Terminal de Controle de Fluxo</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase transition-colors ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : tipoAcessoAtual === TIPO_ACESSO.SAIDA
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        {tipoAcessoAtual === TIPO_ACESSO.ENTRADA && 'Modo Entrada'}
                        {tipoAcessoAtual === TIPO_ACESSO.SAIDA && 'Modo Saída'}
                        {tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO && 'Modo Off-Fluxo'}
                    </div>

                    <div className="text-right hidden sm:block border-l border-slate-200 pl-6">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{usuarioAtual?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Operador Logado
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Tablet Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row relative p-8 gap-8 max-w-[1400px] mx-auto w-full">

                {/* Scanner Section */}
                <div className="flex-[3] bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center p-8 overflow-hidden shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-800 mb-8 flex items-center gap-2">
                        <ScanLine size={24} className="text-indigo-600" /> Leitor de Crachá
                    </h2>

                    {/* Target Frame */}
                    <div className="relative w-full max-w-2xl aspect-[4/3] bg-black rounded-2xl border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">

                        {/* DOM Element p/ Sensor Camera */}
                        <div id="quiosque-camera" className="w-full h-full object-cover"></div>

                        {/* Overlay Clearer */}
                        <div className="absolute inset-0 pointer-events-none z-10">
                            {confFila.animacoesAtivadas && statusLeitura === 'AGUARDANDO' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-[varredura_2.2s_infinite]"></div>
                            )}

                            {statusLeitura !== 'AGUARDANDO' && (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity z-20 
                                    ${confFila.animacoesAtivadas ? 'duration-300' : 'duration-0'} 
                                    ${statusLeitura === 'SUCESSO' ? 'bg-emerald-500/95' : 'bg-rose-500/95'}
                                    `}>
                                    <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center mb-6 shadow-lg animate-bounce">
                                        {statusLeitura === 'SUCESSO'
                                            ? <ShieldCheck size={64} className="text-emerald-600" />
                                            : <UserX size={64} className="text-rose-600" />
                                        }
                                    </div>
                                    <h2 className="text-4xl font-bold text-white mb-2">
                                        {statusLeitura === 'SUCESSO' ? 'Acesso Liberado' : 'Acesso Negado'}
                                    </h2>
                                    <p className="text-white/90 text-lg font-medium">
                                        {ultimoAcesso?.mensagem || 'Processando...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Event Sidebar Utility Style */}
                <div className="w-full lg:w-[450px] bg-white rounded-3xl border border-slate-200 p-8 flex flex-col gap-8 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Zap size={20} className="text-amber-500" />
                        Registro de Atividade
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {ultimoAcesso ? (
                            <div className="space-y-8 animate-fade-in">
                                {ultimoAcesso.aluno && (
                                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center relative overflow-hidden">
                                        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                                            {ultimoAcesso.aluno.foto ? (
                                                <img src={ultimoAcesso.aluno.foto} alt="Foto Aluno" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-5xl font-bold text-slate-300">
                                                    {ultimoAcesso.aluno.nome_completo?.[0] || '?'}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-xl font-bold text-slate-900 mb-1 leading-tight">
                                            {ultimoAcesso.aluno.nome_completo}
                                        </h2>
                                        <p className="text-sm font-medium text-slate-500 mb-6">
                                            Matrícula: {ultimoAcesso.aluno.matricula}
                                        </p>

                                        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-semibold border border-indigo-100">
                                            <ShieldCheck size={16} /> Turma {ultimoAcesso.aluno.turma_id}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${statusLeitura === 'SUCESSO' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
                                        <div className={`text-sm font-bold flex items-center gap-2 ${statusLeitura === 'SUCESSO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {statusLeitura === 'SUCESSO' ? <ShieldCheck size={18} /> : <UserX size={18} />}
                                            {ultimoAcesso.mensagem}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horário</span>
                                        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Clock size={16} className="text-slate-400" />
                                            {ultimoAcesso.hora}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6 opacity-60">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                                    <ScanLine size={40} className="text-slate-300" />
                                </div>
                                <p className="text-sm font-medium text-center">
                                    Aguardando aproximação<br />do crachá...
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Device Status Info */}
                    <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-semibold text-slate-500">Terminal Operante</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            {statusWorker.pendentes > 0 ? `Sincronizando: ${statusWorker.pendentes}` : 'Sincronizado'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

