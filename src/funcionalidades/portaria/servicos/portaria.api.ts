/**
 * API de portaria â€” endpoints de registro de acesso.
 *
 * @module portaria/servicos/portaria.api
 */
import { api } from '@compartilhado/servicos/api';

/**
 * Registra um acesso (entrada/saÃ­da) no backend.
 *
 * @param {import('../types/portaria.tipos').RegistroAcesso} registro
 * @returns {Promise<Object>}
 */
export async function registrarAcesso(registro: import('@compartilhado/types/bancoLocal.tipos').RegistroAcessoLocal): Promise<{ id: string; status: string }> {
    return api.enviar('/acessos', registro);
}

/**
 * Busca dados de um aluno pelo QR Code lido.
 *
 * @param {string} qrCode - ConteÃºdo do QR Code (matrÃ­cula ou cÃ³digo)
 * @returns {Promise<Object>} Dados do aluno
 */
export async function buscarAlunoPorQRCode(qrCode: string): Promise<import('@compartilhado/types/bancoLocal.tipos').AlunoLocal | null> {
    return api.obter(`/aluno/${qrCode}`);
}

export const portariaApi = {
    registrarAcesso,
    buscarAlunoPorQRCode,
};
