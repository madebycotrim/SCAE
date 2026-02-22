import { bancoLocal } from './bancoLocal';
import { api } from './api';
import { autenticacao } from './firebase';

export const Registrador = {
    /**
     * Registra uma ação no log de auditoria
     * @param {string} acao - Código da ação (ex: 'ALUNO_CRIAR', 'LOGIN_SUCESSO')
     * @param {string} entidadeTipo - Tipo da entidade afetada (ex: 'aluno', 'turma', 'usuario')
     * @param {string} entidadeId - ID da entidade afetada
     * @param {object} detalhes - Objeto com detalhes (ex: { nome: 'João', turma: '1A' })
     * @param {object} dadosAnteriores - (Opcional) Estado anterior para diff
     */
    registrar: async (acao, entidadeTipo, entidadeId, detalhes = {}, dadosAnteriores = null) => {
        try {
            const usuario = autenticacao.currentUser;
            const emailUsuario = usuario ? usuario.email : 'sistema@anonimo';

            const novoLog = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                usuario_email: emailUsuario,
                acao: acao,
                entidade_tipo: entidadeTipo,
                entidade_id: entidadeId || 'N/A',
                dados_novos: JSON.stringify(detalhes),
                dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
                user_agent: navigator.userAgent,
                ip_address: 'local', // IP real seria pego pelo backend
                sincronizado: 0
            };

            // 1. Salvar Localmente
            const banco = await bancoLocal.iniciarBanco();
            await banco.put('logs_auditoria', novoLog);

            // 2. Enviar para API (Fire & Forget)
            if (navigator.onLine) {
                // Endpoint correto: /auditoria, Payload: Array
                api.enviar('/auditoria', [novoLog])
                    .then(async () => {
                        // Sucesso: marcar como sincronizado
                        const tx = banco.transaction('logs_auditoria', 'readwrite');
                        const logSalvo = await tx.store.get(novoLog.id);
                        if (logSalvo) {
                            logSalvo.sincronizado = 1;
                            await tx.store.put(logSalvo);
                        }
                        await tx.done;
                    })
                    .catch(err =>
                        console.warn('[Audit] Falha ao enviar log online (será tentado depois):', err)
                    );
            }

            console.log(`[Audit] ${acao} registrado para ${emailUsuario}`);
        } catch (erro) {
            console.error('[Audit] Erro fatal ao registrar log:', erro);
        }
    }
};
