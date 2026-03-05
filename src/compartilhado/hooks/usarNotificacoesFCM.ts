import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../servicos/firebase.config';
import { responsavelServico } from '@funcionalidades/academico/servicos/responsavelServico';
import toast from 'react-hot-toast';

/**
 * Hook para gerenciar as notificações Push (FCM).
 */
export function usarNotificacoesFCM() {
    const [permitido, setPermitido] = useState(Notification.permission === 'granted');
    const [carregando, setCarregando] = useState(false);

    const solicitarPermissao = async () => {
        setCarregando(true);
        try {
            const permissao = await Notification.requestPermission();

            if (permissao === 'granted') {
                // Obter o Token do FCM
                const token = await getToken(messaging, {
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                });

                if (token) {
                    // Salvar o token no nosso backend
                    await responsavelServico.salvarTokenFCM(token);
                    setPermitido(true);
                    toast.success('Notificações ativadas!');
                } else {
                    toast.error('Não foi possível obter o token de notificação.');
                }
            } else {
                toast.error('Permissão de notificação negada.');
            }
        } catch (e) {
            console.error('Erro ao configurar FCM:', e);
            toast.error('Erro ao ativar notificações.');
        } finally {
            setCarregando(false);
        }
    };

    return { permitido, solicitarPermissao, carregando };
}
