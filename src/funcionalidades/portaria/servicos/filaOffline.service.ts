import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { ajustarTimestampLocal } from './clockDrift.service';

const log = criarRegistrador('FilaOffline');

export interface RegistroOffline {
    id: string; // UUID v4 gerado no tablet
    tenantId: string;
    alunoMatricula: string;
    tipoMovimentacao: 'ENTRADA' | 'SAIDA';
    metodoLeitura: 'qr_celular' | 'qr_carteirinha' | 'manual';
    timestampLocal: number; // Horário no momento exato do scan (sem ajuste)
    timestampAjustado: number; // Recalculado via clockDrift.service
    sincronizado: boolean; // false até o envio para o D1
}

/**
 * Insere registro no banco IDB central (SCAE_DB).
 * Transforma o log offline puro em um RegistroAcessoLocal.
 */
export async function enfileirarRegistro(registro: RegistroOffline): Promise<void> {
    try {
        await bancoLocal.salvarRegistro({
            id: registro.id,
            aluno_matricula: registro.alunoMatricula,
            tipo_movimentacao: registro.tipoMovimentacao,
            timestamp: new Date(registro.timestampAjustado).toISOString()
        });
    } catch (e) {
        log.error('Falha de I/O Crítica no idb', e);
    }
}

export const filaOffline = {
    enfileirarRegistro
};
