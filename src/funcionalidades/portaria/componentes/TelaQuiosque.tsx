/**
 * TelaQuiosque â€” Tela principal do tablet (fullscreen, sem navbar, sem menus).
 *
 * Integra com as restriÃ§Ãµes Offline-first: Html5Qrcode otimizado, TTS assÃ­ncrono,
 * Clock drift protection e GravaÃ§Ã£o persistente no IndexedDB.
 */
import { useState, useCallback, useEffect } from 'react';
import type { DadosAluno } from '../servicos/cacheMemoria';

interface FeedbackAcesso {
    aluno?: DadosAluno;
    mensagem: string;
    hora: string;
}
import { usarTenant } from '@tenant/provedorTenant';
import { useAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { useTipoAcesso } from '../hooks/useTipoAcesso';
import { usarModoFila } from '../hooks/useModoFila';
import { usarLeitorQR } from '../hooks/useLeitorQR';
import { filaOffline, RegistroOffline } from '../servicos/filaOffline.service';
import { ajustarTimestampLocal } from '../servicos/clockDrift.service';
import { obterChavePublica, verificarAssinaturaECDSA } from '../utils/validarQR';
import { anunciarNome } from '../utils/anunciarNome';
import { buscarAlunoEmCache, alunoEstaRevogado } from '../servicos/cacheMemoria';
import { TIPO_ACESSO, TipoAcesso } from '../types/portaria.tipos';
import { StatusConexao } from './StatusConexao';
import { format } from 'date-fns';
import { ShieldCheck, UserX, ScanLine } from 'lucide-react';

const log = criarRegistrador('Quiosque');

export default function TelaQuiosque() {
    const tenant = usarTenant();
    const { usuarioAtual } = useAutenticacao();
    const tipoAcessoAtual = useTipoAcesso();
    const confFila = usarModoFila();

    const [ultimoAcesso, definirUltimoAcesso] = useState<FeedbackAcesso | null>(null);
    const [statusLeitura, definirStatusLeitura] = useState<'AGUARDANDO' | 'SUCESSO' | 'ERRO'>('AGUARDANDO');

    // Inicializa carregamento da PK ECDSA no boot do Tablet
    useEffect(() => {
        obterChavePublica().catch(e => log.error('Falha ao obter chave pÃºblica', e));
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

        hookRestart(); // Retorna o funcionamento

        setTimeout(() => {
            definirStatusLeitura('AGUARDANDO');
        }, confFila.duracaoFeedbackMs * 1.5); // Demora mais quando erra para porteiro ler
    }

    // InstanciaÃ§Ã£o Pura (Sobe em Loop CÃ¢mera ao dar mount)
    usarLeitorQR('quiosque-camera', processarDecodificacao);

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden text-white font-sans selection:bg-indigo-500/30">
            <StatusConexao />

            {/* Header Redux */}
            <div className="h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-black tracking-tight text-white uppercase">
                        {tenant?.nomeEscola} | PORTARIA INTELIGENTE
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-sm ${tipoAcessoAtual === TIPO_ACESSO.ENTRADA
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : tipoAcessoAtual === TIPO_ACESSO.SAIDA
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-slate-700/50 border-slate-600/20 text-slate-400'
                        }`}>
                        {tipoAcessoAtual === TIPO_ACESSO.ENTRADA && 'ðŸŸ¢ ENTRADA'}
                        {tipoAcessoAtual === TIPO_ACESSO.SAIDA && 'ðŸ”´ SAÃDA'}
                        {tipoAcessoAtual === TIPO_ACESSO.INDEFINIDO && 'â¸ FORA DO HORÃRIO'}
                    </div>

                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white leading-tight">{usuarioAtual?.email}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Operador</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row relative">
                <div className="flex-1 bg-black relative flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md aspect-square bg-slate-900 rounded-lg border-2 border-slate-700 overflow-hidden ring-1 ring-white/5">

                        {/* DOM Element p/ Sensor Camera injetado pelo Hook */}
                        <div id="quiosque-camera" className="w-full h-full bg-black"></div>

                        {/* Overlay DinÃ¡mico */}
                        <div className="absolute inset-0 pointer-events-none">
                            {confFila.animacoesAtivadas && statusLeitura === 'AGUARDANDO' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-[varredura_2s_infinite]"></div>
                            )}

                            {statusLeitura !== 'AGUARDANDO' && (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all z-10 
                                    ${confFila.animacoesAtivadas ? 'duration-300' : 'duration-0'} 
                                    ${statusLeitura === 'SUCESSO' ? 'bg-emerald-600' : 'bg-rose-600'}
                                    `}>
                                    <div className="p-6 rounded-full bg-white mb-4">
                                        {statusLeitura === 'SUCESSO'
                                            ? <ShieldCheck size={48} className="text-emerald-600 drop-shadow-lg" />
                                            : <UserX size={48} className="text-rose-600 drop-shadow-lg" />
                                        }
                                    </div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2">
                                        {statusLeitura === 'SUCESSO' ? 'LIBERADO' : 'NEGADO'}
                                    </h2>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Historico Lateral */}
                <div className="w-full md:w-96 bg-slate-800 border-l border-white/5 p-6 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <ScanLine size={14} className="text-amber-400" />
                        Ãšltimos Eventos
                    </h3>

                    {ultimoAcesso ? (
                        <div className="flex-1 flex flex-col animate-in fade-in zoom-in duration-300">
                            {ultimoAcesso.aluno && (
                                <div className="bg-slate-700/50 rounded-lg p-6 border border-white/5 mb-6 text-center shadow-lg">
                                    <h2 className="text-xl font-bold text-white mb-1">{ultimoAcesso.aluno.nome_completo}</h2>
                                    <p className="text-slate-400 font-mono text-sm mb-4">{ultimoAcesso.aluno.matricula}</p>
                                    <div className="inline-block bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/30">
                                        Turma {ultimoAcesso.aluno.turma_id}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                    <span className="text-sm text-slate-400">Mensagem</span>
                                    <span className={`text-sm font-bold ${statusLeitura === 'SUCESSO' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {ultimoAcesso.mensagem}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                    <span className="text-sm text-slate-400">HorÃ¡rio Local</span>
                                    <span className="text-sm font-bold text-white font-mono">{ultimoAcesso.hora}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                            <ScanLine size={48} strokeWidth={1} />
                            <p className="text-sm font-medium text-center">
                                Aproxime o QR Code
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
