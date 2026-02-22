import { bancoLocal } from './bancoLocal';
import { api } from './api';

/**
 * Serviço de Auditoria - Registro de Ações para Conformidade LGPD
 * Armazena logs imutáveis de todas as ações administrativas
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
    EXCLUSAO_REGISTRO: 'EXCLUSAO_REGISTRO'
};

/**
 * Registra uma ação de auditoria
 * @param {string} usuarioEmail - Email do usuário que executou a ação
 * @param {string} acao - Tipo de ação (use ACOES_AUDITORIA)
 * @param {string} entidadeTipo - Tipo de entidade (aluno, turma, usuario, etc)
 * @param {string} entidadeId - ID da entidade afetada
 * @param {object} dadosAnteriores - Dados antes da modificação
 * @param {object} dadosNovos - Dados após a modificação
 */
export async function registrarAuditoria({
    usuarioEmail,
    acao,
    entidadeTipo,
    entidadeId = null,
    dadosAnteriores = null,
    dadosNovos = null
}) {
    try {
        const log = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            usuario_email: usuarioEmail,
            acao,
            entidade_tipo: entidadeTipo,
            entidade_id: entidadeId,
            dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
            dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null,
            ip_address: await obterIPPublico(),
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString(),
            sincronizado: 0 // 0 = false (padrão para indexação)
        };

        // Salvar localmente (IndexedDB)
        const banco = await bancoLocal.iniciarBanco();
        await banco.add('logs_auditoria', log);

        // Tentar enviar para servidor se online
        if (navigator.onLine) {
            // Em background para não travar a UI
            sincronizarLogs().catch(err => console.warn('Sync background falhou:', err));
        }

        return log;
    } catch (erro) {
        console.error('Erro ao registrar auditoria:', erro);
        throw erro;
    }
}

/**
 * Busca logs de auditoria com filtros
 * @param {object} filtros - Filtros opcionais (usuario, acao, dataInicio, dataFim, etc)
 * @returns {Array} Lista de logs
 */
export async function buscarLogs(filtros = {}) {
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
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return logs;
    } catch (erro) {
        console.error('Erro ao buscar logs:', erro);
        return [];
    }
}

/**
 * Exporta logs para JSON (backup)
 * @param {string} dataInicio - Data inicial (ISO)
 * @param {string} dataFim - Data final (ISO)
 * @returns {string} JSON string dos logs
 */
export async function exportarLogsParaBackup(dataInicio, dataFim) {
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
        console.error('Erro ao exportar logs:', erro);
        throw erro;
    }
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Obtém IP público do usuário (para auditoria)
 * Usa serviço gratuito ipify.org
 */
async function obterIPPublico() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            timeout: 2000
        });
        const data = await response.json();
        return data.ip;
    } catch {
        return 'N/A'; // Se falhar, não é crítico
    }
}

/**
 * Sincroniza logs pendentes com servidor
 * Chamado periodicamente pelo servicoSincronizacao
 */
export async function sincronizarLogs() {
    if (!navigator.onLine) return;

    try {
        const banco = await bancoLocal.iniciarBanco();
        const logs = await banco.getAll('logs_auditoria');

        // Filtrar logs não sincronizados (usando 0/1 ou false/true)
        const logsPendentes = logs.filter(log => !log.sincronizado);

        if (logsPendentes.length === 0) return;

        console.log(`Auditoria: Tentando sincronizar ${logsPendentes.length} logs...`);

        // Enviar para API
        const respostas = await api.enviar('/auditoria', logsPendentes);

        // Processar respostas para marcar com sucesso
        const logsSincronizados = respostas.filter(r => r.status === 'sincronizado');

        if (logsSincronizados.length > 0) {
            const tx = banco.transaction('logs_auditoria', 'readwrite');
            for (const item of logsSincronizados) {
                const log = await tx.store.get(item.id);
                if (log) {
                    log.sincronizado = 1; // Marcar como true
                    await tx.store.put(log);
                }
            }
            await tx.done;
            console.log(`✅ ${logsSincronizados.length} logs de auditoria sincronizados.`);
        }

    } catch (erro) {
        console.error('Erro na sincronização de logs:', erro);
    }
}
