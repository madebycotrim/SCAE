/**
 * Serviço de sessão quiosque — mantém a sessão Firebase ativa indefinidamente.
 * Usa indexedDBLocalPersistence do Firebase para sobreviver a reinicializações.
 * O admin loga uma vez — o tablet nunca pede login novamente.
 *
 * @module autenticacao/servicos/sessaoQuiosque.service
 */
import { getAuth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { autenticacao } from '@funcionalidades/autenticacao/servicos/firebase.config';

/**
 * Configura a sessão Firebase para persistir indefinidamente no IndexedDB.
 * Deve ser chamado ANTES do login no modo quiosque.
 *
 * @returns {Promise<void>}
 */
export async function configurarSessaoPermanente(): Promise<void> {
    await setPersistence(autenticacao, indexedDBLocalPersistence);
}

/**
 * Verifica se existe uma sessão ativa no dispositivo.
 *
 * @returns {Promise<boolean>}
 */
export function verificarSessaoAtiva(): boolean {
    return autenticacao.currentUser !== null;
}

/**
 * Renova o token de autenticação se estiver prestes a expirar.
 * Chamado periodicamente pelo hook useSessaoQuiosque.
 *
 * @returns {Promise<string|null>} Token renovado ou null se sem sessão
 */
export async function renovarToken(): Promise<string | null> {
    if (!autenticacao.currentUser) return null;
    return autenticacao.currentUser.getIdToken(true);
}

export const sessaoQuiosque = {
    configurarSessaoPermanente,
    verificarSessaoAtiva,
    renovarToken,
};
