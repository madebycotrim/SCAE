import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// IMPORTANTE: Essas chaves geralmente vem do Vite env. Mas como Service Workers nativos 
// não tem suporte ao import.meta.env, precisamos expô-las de outra forma, via URL params
// ou com valores brutos do Firebase.

// DICA: No Vite PWA, poderiamos injetar essas vars. Para fim de isolamento (MVP):
const firebaseConfig = {
    apiKey: new URL(location.href).searchParams.get('apiKey'),
    authDomain: new URL(location.href).searchParams.get('authDomain'),
    projectId: new URL(location.href).searchParams.get('projectId'),
    storageBucket: new URL(location.href).searchParams.get('storageBucket'),
    messagingSenderId: new URL(location.href).searchParams.get('messagingSenderId'),
    appId: new URL(location.href).searchParams.get('appId')
};

// Como o PWA envia as chaves pela querystring do SW no vite-plugin-pwa
// Para SW injetado, inicializa a lib do Firebase
if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Registra listener em Background (quando o app/PWA do resposável fechado)
    onBackgroundMessage(messaging, (payload) => {
        console.log('[firebase-messaging-sw.js] Recebeu notificação em background', payload);

        // AQUI ESTÁ A LGPD ACTING: Nós só pegamos "nome" e "status" da payload FCM.
        const notificationTitle = payload.notification?.title || 'SCAE - Portaria';
        const notificationOptions = {
            body: payload.notification?.body || 'Nova movimentação na escola.',
            icon: '/icones/pwa-192x192.svg', // Icone do PWA publico
        };

        // Dispara o popup do S.O (Android / iOS / Windows)
        // @ts-ignore
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}
