import { bancoLocal } from './bancoLocal';
import { api } from './api';
import { autenticacao } from '@funcionalidades/autenticacao/servicos/firebase.config';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const registradorInterno = criarRegistrador('Auditoria');

/**
 * Serviço de Auditoria - Registro de Ações para Conformidade LGPD
 * Armazena logs imutáveis de todas as ações administrativas no Cloudflare D1/R2.
 */

// Tipos de ações auditadas
export const ACOES_AUDITORIA = {
    // Alunos
    CRIAR_ALUNO: 'CRIAR_ALUNO',
    EDITAR_ALUNO: 'EDITAR_ALUNO',
    DELETAR_ALUNO: 'DELETAR_ALUNO',

    // Turmas
    CRIAR_TURMA: 'CRIAR_TURMA',
    EDITAR_TURMA: 'EDITAR_TURMA',
    DELETAR_TURMA: 'DELETAR_TURMA',

    // Usuários/Permissões
    CRIAR_USUARIO: 'CRIAR_USUARIO',
    EDITAR_PERMISSOES: 'EDITAR_PERMISSOES',
    DESATIVAR_USUARIO: 'DESATIVAR_USUARIO',

    // Segurança
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    TENTATIVA_ACESSO_NEGADO: 'TENTATIVA_ACESSO_NEGADO',
    QR_CODE_INVALIDO: 'QR_CODE_INVALIDO',

    // Registros
    REGISTRO_MANUAL: 'REGISTRO_MANUAL',
    CORRECAO_REGISTRO: 'CORRECAO_REGISTRO',
    EXCLUSAO_REGISTRO: 'EXCLUSAO_REGISTRO',

    // Evasão
    EVASAO_LISTAR_FALHA: 'EVASAO_LISTAR_FALHA',
    EVASAO_STATUS_ATUALIZAR: 'EVASAO_STATUS_ATUALIZAR',
    EVASAO_STATUS_FALHA: 'EVASAO_STATUS_FALHA',
    EVASAO_MOTOR_EXECUCAO: 'EVASAO_MOTOR_EXECUCAO',
    EVASAO_MOTOR_FALHA: 'EVASAO_MOTOR_FALHA'
};

export interface ParamsAuditoria {
    usuarioEmail: string;
    acao: string;
    entidadeTipo: string;
    entidadeId?: string | null;
    dadosAnteriores?: Record<string, unknown> | null;
    dadosNovos?: Record<string, unknown> | null;
}

/**
 * Objeto centralizador de registro de auditoria.
 * Preferível para uso em componentes e hooks.
 */
export const Registrador = {
    /**
     * Registra uma ação no log de auditoria.
     * @param acao - Código da ação (ex: 'ALUNO_CRIAR', 'LOGIN_SUCESSO')
     * @param entidadeTipo - Tipo da entidade afetada (ex: 'aluno', 'turma', 'usuario')
     * @param entidadeId - ID da entidade afetada
     * @param detalhes - Objeto com detalhes (ex: { nome: 'João', turma: '1A' })
     * @param dadosAnteriores - (Opcional) Estado anterior para diff
     */
    registrar: async (
        acao: string,
        entidadeTipo: string,
        entidadeId: string,
        detalhes: Record<string, unknown> = {},
        dadosAnteriores: Record<string, unknown> | null = null
    ) => {
        try {
            const usuario = autenticacao.currentUser;
            const emailUsuario = usuario ? usuario.email : 'sistema@anonimo';

            await registrarAuditoria({
                usuarioEmail: emailUsuario || 'sistema@sem-email',
                acao,
                entidadeTipo,
                entidadeId,
                dadosAnteriores,
                dadosNovos: detalhes
            });

            registradorInterno.info(`${acao} registrado para ${emailUsuario}`);
        } catch (erro) {
            registradorInterno.error('Erro fatal ao registrar log', erro);
        }
    }
};

/**
 * Registra uma ação de auditoria bruta.
 */
export async function registrarAuditoria({
    usuarioEmail,
    acao,
    entidadeTipo,
    entidadeId = null,
    dadosAnteriores = null,
    dadosNovos = null
}: ParamsAuditoria) {
    try {
        const log = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            usuario_email: usuarioEmail,
            acao,
            entidade_tipo: entidadeTipo,
            entidade_id: entidadeId || 'N/A',
            dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
            dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null,
            ip_address: 'local',
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString(),
            sincronizado: 0
        };

        // Salvar localmente (IndexedDB)
        const banco = await bancoLocal.iniciarBanco();
        await banco.put('logs_auditoria', log);

        // Tentar enviar para servidor se online (Fire & Forget)
        if (navigator.onLine) {
            api.enviar('/auditoria', [log])
                .then(async () => {
                    const tx = banco.transaction('logs_auditoria', 'readwrite');
                    const logSalvo = await tx.store.get(log.id);
                    if (logSalvo) {
                        logSalvo.sincronizado = 1;
                        await tx.store.put(logSalvo);
                    }
                    await tx.done;
                })
                .catch(err => registradorInterno.warn('Sync background falhou', err));
        }

        return log;
    } catch (erro) {
        registradorInterno.error('Erro ao registrar auditoria', erro);
        throw erro;
    }
}

/**
 * Busca logs de auditoria com filtros.
 */
export async function buscarLogs(filtros: Partial<import('@compartilhado/types/bancoLocal.tipos').FiltrosLog> = {}) {
    try {
        const banco = await bancoLocal.iniciarBanco();
        let logs = await banco.getAll('logs_auditoria');

        // Aplicar filtros
        if (filtros.usuarioEmail) {
            logs = logs.filter(log => log.usuario_email === filtros.usuarioEmail);
        }

        if (filtros.acao) {
            logs = logs.filter(log => log.acao === filtros.acao);
        }

        if (filtros.entidadeTipo) {
            logs = logs.filter(log => log.entidade_tipo === filtros.entidadeTipo);
        }

        if (filtros.dataInicio) {
            logs = logs.filter(log => log.timestamp >= filtros.dataInicio);
        }

        if (filtros.dataFim) {
            logs = logs.filter(log => log.timestamp <= filtros.dataFim);
        }

        // Ordenar por mais recente
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return logs;
    } catch (erro) {
        registradorInterno.error('Erro ao buscar logs', erro);
        return [];
    }
}

/**
 * Exporta logs para JSON (backup).
 */
export async function exportarLogsParaBackup(dataInicio: string, dataFim: string) {
    try {
        const logs = await buscarLogs({ dataInicio, dataFim });

        const backup = {
            exportado_em: new Date().toISOString(),
            periodo: { inicio: dataInicio, fim: dataFim },
            total_registros: logs.length,
            logs
        };

        return JSON.stringify(backup, null, 2);
    } catch (erro) {
        registradorInterno.error('Erro ao exportar logs', erro);
        throw erro;
    }
}

/**
 * Sincroniza logs pendentes com servidor.
 */
export async function sincronizarLogs() {
    if (!navigator.onLine) return;

    try {
        const banco = await bancoLocal.iniciarBanco();
        const logs = await banco.getAll('logs_auditoria');
        const logsPendentes = logs.filter(log => !log.sincronizado);

        if (logsPendentes.length === 0) return;

        registradorInterno.info(`Tentando sincronizar ${logsPendentes.length} logs...`);

        const respostas = await api.enviar<Array<{ id: string; status: string }>>('/auditoria', logsPendentes);
        const logsSincronizados = respostas.filter(r => r.status === 'sincronizado');

        if (logsSincronizados.length > 0) {
            const tx = banco.transaction('logs_auditoria', 'readwrite');
            for (const item of logsSincronizados) {
                const log = await tx.store.get(item.id);
                if (log) {
                    log.sincronizado = 1;
                    await tx.store.put(log);
                }
            }
            await tx.done;
            registradorInterno.info(`${logsSincronizados.length} logs de auditoria sincronizados.`);
        }
    } catch (erro) {
        registradorInterno.error('Erro na sincronização de logs', erro);
    }
}
