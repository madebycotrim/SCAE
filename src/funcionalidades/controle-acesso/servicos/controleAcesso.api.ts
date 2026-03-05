/**
 * API de Controle de Acesso — endpoints de registro de fluxo escolar.
 *
 * @module controle-acesso/servicos/controleAcesso.api
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Registra um acesso (entrada/saída) no backend.
 */
export async function registrarAcesso(registro: import('@compartilhado/types/bancoLocal.tipos').RegistroAcessoLocal): Promise<{ id: string; status: string }> {
    return api.enviar('/acesso/registros', registro);
}

/**
 * Busca dados de um aluno pelo QR Code lido.
 */
export async function buscarAlunoPorQRCode(qrCode: string): Promise<import('@compartilhado/types/bancoLocal.tipos').AlunoLocal | null> {
    return api.obter(`/aluno/${qrCode}`);
}

export const controleAcessoApi = {
    registrarAcesso,
    buscarAlunoPorQRCode,
};
