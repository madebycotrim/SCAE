/// <reference lib="webworker" />

import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import type { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';

const API_URL = import.meta.env?.VITE_API_URL || '/api'; // fallback Vite

let isSyncing = false;

// Função nativa Fetch para enviar em batches
async function processarLote(batch: RegistroAcessoLocal[], authHeader: string, tenantId: string): Promise<string[]> {
    try {
        const resposta = await fetch(`${API_URL}/acessos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authHeader}`,
                'X-Tenant-ID': tenantId
            },
            body: JSON.stringify(batch)
        });

        if (!resposta.ok) throw new Error('Falha HTTP da API D1 Offline');

        const data: Array<{ id: string; status: string }> = await resposta.json();
        // API retorna as IDs de quem foi sincronizado com sucesso
        return data.filter(r => r.status === 'sincronizado').map(r => r.id);
    } catch (e) {
        console.warn('[WORKER] API inatingível no momento. Retentando futuramente.', e);
        return [];
    }
}

// O Loop principal de drenagem (Push Offload)
async function drenarFila(authHeader: string, tenantId: string) {
    if (isSyncing) return;
    try {
        isSyncing = true;

        // Pega todos os registros idb SCAE_DB.registros_acesso pendentes
        const pendentesRaw = await bancoLocal.listarRegistrosPendentes();
        if (pendentesRaw.length === 0) {
            postMessage({ type: 'SYNC_STATUS', payload: { pendentes: 0, status: 'IDLE' } });
            isSyncing = false;
            return;
        }

        // Separa num Lote de max 50 para evitar Out of Memory ou Timeout no Cloudflare Worker
        const lote = pendentesRaw.slice(0, 50);

        postMessage({ type: 'SYNC_STATUS', payload: { pendentes: pendentesRaw.length, status: 'SYNCING' } });

        const idsSincronizados = await processarLote(lote, authHeader, tenantId);

        if (idsSincronizados.length > 0) {
            // Marca como sincronizado no SCAE_DB oficial
            await bancoLocal.marcarComoSincronizado(idsSincronizados);

            postMessage({ type: 'SYNC_SUCESSO', payload: { processados: idsSincronizados.length } });

            // Loop recursivo se houver mais na fila do IDB
            isSyncing = false;
            drenarFila(authHeader, tenantId);
        }

    } catch (err) {
        console.error('[WORKER] Crash Fatal I/O Banco IndexedDB.', err);
    } finally {
        isSyncing = false;
    }
}

// Escuta comandos da Main Thread
self.addEventListener('message', async (e: MessageEvent) => {
    const { tipo, authHeader, tenantId } = e.data;

    // Sinal de Acordar do Hook `usarPortariaWorker`
    if (tipo === 'INICIAR_DRENAGEM') {
        if (!authHeader || !tenantId) return;

        // Impede execução fútil se o sistema operacional sabe que a rede caiu
        if (!navigator.onLine) {
            postMessage({ type: 'SYNC_STATUS', payload: { status: 'OFFLINE' } });
            return;
        }

        drenarFila(authHeader, tenantId);
    }
});
