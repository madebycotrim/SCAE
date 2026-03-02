import { useEffect, useRef, useState, useCallback } from 'react';
import PortariaWorker from '../servicos/portaria.worker?worker';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarTenant } from '@tenant/provedorTenant';
import { autenticacao } from '@funcionalidades/autenticacao/servicos/firebase.config';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('PortariaWorker');

export interface StatusWorker {
    pendentes: number;
    status: 'IDLE' | 'SYNCING' | 'OFFLINE';
}

/**
 * Hook de inicialização e comunicação paralela com o Web Worker do SCAE.
 * Impede que a Thread de UI bloqueie enquanto o Dexie sincroniza centenas
 * de dados pro Cloudflare D1.
 */
export function usarPortariaWorker() {
    const workerRef = useRef<Worker | null>(null);
    const { usuarioAtual } = usarAutenticacao();
    const tenant = usarTenant();

    const [statusWorker, definirStatusWorker] = useState<StatusWorker>({
        pendentes: 0,
        status: 'IDLE'
    });

    // 1. Instanciar o Worker de fundo apenas 1 vez (On Mount)
    useEffect(() => {
        if (!workerRef.current) {
            log.info('Inicializando Thread Paralela do Worker da Portaria...');
            workerRef.current = new PortariaWorker();

            workerRef.current.onmessage = (evento: MessageEvent) => {
                const { type, payload } = evento.data;
                if (type === 'SYNC_STATUS') {
                    definirStatusWorker(payload);
                } else if (type === 'SYNC_SUCESSO') {
                    log.info(`Background Worker Lote Concluído: ${payload.processados} enviados.`);
                }
            };
        }

        return () => {
            log.info('Finalizando Thread Paralela...');
            workerRef.current?.terminate();
        };
    }, []);

    // 2. Método Assíncrono para cutucar o worker (repassando o JWT Token)
    const acionarWorker = useCallback(async () => {
        if (!workerRef.current || !usuarioAtual || !tenant?.id) return;

        try {
            const user = autenticacao.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            workerRef.current.postMessage({
                tipo: 'INICIAR_DRENAGEM',
                authHeader: token,
                tenantId: tenant.id
            });
        } catch (e) {
            log.error('Falha ao obter token para o Worker', e);
        }
    }, [usuarioAtual, tenant?.id]);

    // 3. Cutucar naturalmente na montagem e no evento da rede
    useEffect(() => {
        let timer = setInterval(acionarWorker, 30000); // Poll de segurança passiva a cada 30s
        window.addEventListener('online', acionarWorker);

        return () => {
            clearInterval(timer);
            window.removeEventListener('online', acionarWorker);
        };
    }, [acionarWorker]);

    return { statusWorker, acionarWorker };
}
