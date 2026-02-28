/**
 * Utilitário de Síntese de Voz (TTS) para anunciar o nome do aluno.
 */
export function anunciarNome(nome: string) {
    if (!('speechSynthesis' in window)) return;

    // Cancelar qualquer anúncio anterior para não encavalar
    window.speechSynthesis.cancel();

    const anuncio = new SpeechSynthesisUtterance(nome);
    anuncio.lang = 'pt-BR';
    anuncio.rate = 1.1;
    window.speechSynthesis.speak(anuncio);
}
