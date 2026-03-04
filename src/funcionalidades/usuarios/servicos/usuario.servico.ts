import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { api } from '@compartilhado/servicos/api';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import type { UsuarioLocal } from '@compartilhado/types/bancoLocal.tipos';

const log = criarRegistrador('UsuarioServico');

export const usuarioServico = {
    /**
     * Salva ou convida um usuário com estratégia Online-First.
     */
    async salvarUsuario(dados: any, ehEdicao: boolean): Promise<void> {
        const usuarioNovo = {
            ...dados,
            atualizado_em: new Date().toISOString(),
            sincronizado: 1
        };

        try {
            // 1. Tentar salvar no servidor primeiro
            if (navigator.onLine) {
                await api.enviar(`/usuarios/${usuarioNovo.email}`, usuarioNovo);
                log.info('Usuário salvo online com sucesso');
            } else {
                throw new Error('Offline');
            }
        } catch (erro) {
            log.warn('Falha ao salvar usuário online, recorrendo ao banco local', erro);
            usuarioNovo.sincronizado = 0;
        }

        try {
            // 2. Persistir localmente
            const banco = await bancoLocal.iniciarBanco();
            await banco.put('usuarios', usuarioNovo);

            // 3. Auditoria
            const acao = ehEdicao ? 'USUARIO_EDITAR' : 'USUARIO_CONVIDAR';
            await Registrador.registrar(acao, 'usuario', usuarioNovo.email, {
                papel: usuarioNovo.papel,
                via: usuarioNovo.sincronizado ? 'online' : 'local'
            });
        } catch (erroLocal) {
            log.error('Erro ao salvar usuário localmente', erroLocal);
            throw erroLocal;
        }
    },

    /**
     * Altera o status (ativo/inativo) do usuário com estratégia Online-First.
     */
    async toggleStatus(user: UsuarioLocal): Promise<void> {
        const novoStatus = !user.ativo;
        const atualizado = { ...user, ativo: novoStatus, sincronizado: 1, atualizado_em: new Date().toISOString() };

        try {
            // 1. Tentar atualizar no servidor primeiro
            if (navigator.onLine) {
                await api.atualizar(`/usuarios/${user.email}`, { ativo: novoStatus });
                log.info('Status do usuário atualizado online');
            } else {
                throw new Error('Offline');
            }
        } catch (erro) {
            log.warn('Falha ao atualizar status online, recorrendo ao banco local', erro);
            atualizado.sincronizado = 0;
        }

        try {
            // 2. Persistir localmente
            const banco = await bancoLocal.iniciarBanco();
            await banco.put('usuarios', atualizado);

            // 3. Auditoria
            const acao = novoStatus ? 'USUARIO_LIBERAR' : 'USUARIO_BLOQUEAR';
            await Registrador.registrar(acao, 'usuario', user.email, { via: atualizado.sincronizado ? 'online' : 'local' });
        } catch (erroLocal) {
            log.error('Erro ao alterar status localmente', erroLocal);
            throw erroLocal;
        }
    },

    /**
     * Exclui um usuário com estratégia Online-First.
     */
    async excluirUsuario(email: string): Promise<void> {
        let removidoOnline = false;
        try {
            // 1. Tentar remover do servidor primeiro
            if (navigator.onLine) {
                await api.remover(`/usuarios/${email}`);
                removidoOnline = true;
            }
        } catch (erro) {
            log.warn('Falha ao remover usuário online, agendando para depois', erro);
            await bancoLocal.adicionarPendencia('DELETE', 'usuarios', email);
        }

        try {
            // 2. Remover localmente
            const banco = await bancoLocal.iniciarBanco();
            await banco.delete('usuarios', email);

            await Registrador.registrar('USUARIO_EXCLUIR', 'usuario', email, { status: removidoOnline ? 'online' : 'pendente' });
        } catch (erroLocal) {
            log.error('Erro ao excluir usuário localmente', erroLocal);
            throw erroLocal;
        }
    }
};
