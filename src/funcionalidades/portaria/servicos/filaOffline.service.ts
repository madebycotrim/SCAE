import Dexie, { type Table } from 'dexie';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('FilaOffline');

export interface RegistroOffline {
    id: string; // UUID v4 gerado no tablet
    tenantId: string;
    alunoMatricula: string;
    tipoMovimentacao: 'ENTRADA' | 'SAIDA';
    metodoLeitura: 'qr_celular' | 'qr_carteirinha' | 'manual';
    timestampLocal: number; // HorÃ¡rio no momento exato do scan (sem ajuste)
    timestampAjustado: number; // Recalculado via clockDrift.service
    sincronizado: boolean; // false atÃ© o envio para o D1
}

export class PortariaDatabase extends Dexie {
    acessosPendentes!: Table<RegistroOffline, string>;

    constructor() {
        super('portaria_offline_db');
        // Define as chaves primÃ¡rias e Ã­ndices
        this.version(1).stores({
            acessosPendentes: 'id, tenantId, sincronizado'
        });
    }
}

export const dbFluxoLocal = new PortariaDatabase();

/**
 * Insere registro primÃ¡rio na fila Offline.
 */
export async function enfileirarRegistro(registro: RegistroOffline): Promise<void> {
    try {
        await dbFluxoLocal.acessosPendentes.put(registro);
    } catch (e) {
        log.error('Falha de I/O CrÃ­tica no IndexedDB Dexie', e);
    }
}

/**
 * Busca acessos estagnados na rede local aguardando upload.
 */
export async function buscarPendentes(tenantId: string): Promise<RegistroOffline[]> {
    return dbFluxoLocal.acessosPendentes
        .where({ tenantId, sincronizado: false })
        .toArray();
}

/**
 * Transforma o boolean de sincronia local em true indicando upload de sucesso.
 */
export async function marcarComoSincronizado(id: string): Promise<void> {
    await dbFluxoLocal.acessosPendentes.update(id, { sincronizado: true });
}

export const filaOffline = {
    enfileirarRegistro,
    buscarPendentes,
    marcarComoSincronizado,
};
