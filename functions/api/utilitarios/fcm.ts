/**
 * Utilitário para envio de notificações Push via Firebase Cloud Messaging (FCM).
 * Baseado na API HTTP v1 do Firebase.
 */
export class FabricaFCM {
    /**
     * Envia uma notificação para um token específico.
     * @param token - Token FCM do dispositivo de destino
     * @param titulo - Título da notificação
     * @param corpo - Corpo da mensagem
     * @param dados - Metadados adicionais (opcional)
     */
    static async enviarNotificacao(
        token: string,
        titulo: string,
        corpo: string,
        dados?: Record<string, string>,
        serverKey?: string // TODO: Migrar para FCM v1 com Service Account no futuro
    ) {
        if (!token) return;

        // Se não tiver serverKey, apenas logamos (para desenvolvimento)
        if (!serverKey) {
            console.warn('[FCM] Notificação não enviada: FIREBASE_SERVER_KEY ausente.');
            console.log(`[FCM-SIMULADO] Para: ${token} | Título: ${titulo} | Corpo: ${corpo}`);
            return;
        }

        try {
            const resposta = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${serverKey}`
                },
                body: JSON.stringify({
                    to: token,
                    notification: {
                        title: titulo,
                        body: corpo,
                        icon: '/icones/pwa-192x192.svg',
                        click_action: '/'
                    },
                    data: dados
                })
            });

            if (!resposta.ok) {
                const erro = await resposta.text();
                console.error('[FCM] Erro na resposta do Google:', erro);
            }
        } catch (e) {
            console.error('[FCM] Falha ao disparar fetch:', e);
        }
    }
}
