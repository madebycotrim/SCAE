/**
 * Servico de Reconhecimento Facial — SCAE
 * 
 * Usa face-api.js para deteccao e reconhecimento facial 100% local (browser).
 * Nenhuma imagem sai do dispositivo. Apenas descritores numericos (vetores 128d)
 * sao armazenados e sincronizados.
 * 
 * LGPD Art. 11 — Dado biometrico sensivel. Requer consentimento especifico.
 */
import * as faceapi from 'face-api.js';

// Estado do servico
let modelosCarregados = false;
let carregandoModelos = false;

// Cache de descritores faciais em memoria (Map<matricula, Float32Array[]>)
const cacheDescritores = new Map<string, Float32Array[]>();

// Threshold de distancia para considerar match (quanto menor, mais restrito)
const LIMIAR_RECONHECIMENTO = 0.5;

/**
 * Carrega os modelos do face-api.js a partir de /modelos-faciais/
 * Deve ser chamado uma unica vez na inicializacao do quiosque.
 */
export async function carregarModelosFaciais(): Promise<void> {
    if (modelosCarregados || carregandoModelos) return;

    carregandoModelos = true;

    try {
        const caminhoModelos = '/modelos-faciais';

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(caminhoModelos),
            faceapi.nets.faceLandmark68Net.loadFromUri(caminhoModelos),
            faceapi.nets.faceRecognitionNet.loadFromUri(caminhoModelos),
        ]);

        modelosCarregados = true;
        console.log('[Facial] Modelos carregados com sucesso');
    } catch (erro) {
        console.error('[Facial] Erro ao carregar modelos:', erro);
        throw erro;
    } finally {
        carregandoModelos = false;
    }
}

/**
 * Verifica se os modelos estao carregados.
 */
export function modelosProntos(): boolean {
    return modelosCarregados;
}

/**
 * Extrai o descritor facial (vetor 128d) de um elemento de video.
 * Retorna null se nenhum rosto for detectado.
 */
export async function extrairDescritor(
    elementoVideo: HTMLVideoElement
): Promise<Float32Array | null> {
    if (!modelosCarregados) {
        throw new Error('[Facial] Modelos nao carregados. Chame carregarModelosFaciais() primeiro.');
    }

    const deteccao = await faceapi
        .detectSingleFace(elementoVideo, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!deteccao) return null;

    return deteccao.descriptor;
}

/**
 * Cadastra descritores faciais para um aluno.
 * Recebe multiplos descritores (capturados durante os 3 segundos)
 * e armazena no cache de memoria.
 */
export function cadastrarDescritor(
    matricula: string,
    descritores: Float32Array[]
): void {
    if (descritores.length === 0) {
        throw new Error('[Facial] Nenhum descritor fornecido para cadastro.');
    }

    cacheDescritores.set(matricula, descritores);
    console.log(`[Facial] Cadastrado: ${matricula} com ${descritores.length} descritores`);
}

/**
 * Remove descritores de um aluno do cache.
 */
export function removerDescritor(matricula: string): void {
    cacheDescritores.delete(matricula);
}

/**
 * Carrega descritores em massa no cache (ex: ao iniciar o quiosque).
 * Os descritores vem do IndexedDB ou da API.
 */
export function carregarDescritoresEmMassa(
    dados: Array<{ matricula: string; descritores: number[][] }>
): void {
    cacheDescritores.clear();

    for (const item of dados) {
        const descritores = item.descritores.map(d => new Float32Array(d));
        cacheDescritores.set(item.matricula, descritores);
    }

    console.log(`[Facial] ${dados.length} alunos carregados no cache de reconhecimento`);
}

/**
 * Tenta reconhecer um rosto comparando com todos os descritores em cache.
 * Retorna a matricula do aluno reconhecido e a distancia, ou null se ninguem for reconhecido.
 */
export async function reconhecerRosto(
    elementoVideo: HTMLVideoElement
): Promise<{ matricula: string; distancia: number } | null> {
    const descritor = await extrairDescritor(elementoVideo);
    if (!descritor) return null;

    let melhorMatch: { matricula: string; distancia: number } | null = null;

    for (const [matricula, descritoresAluno] of cacheDescritores.entries()) {
        for (const descRef of descritoresAluno) {
            const distancia = faceapi.euclideanDistance(descritor, descRef);

            if (distancia < LIMIAR_RECONHECIMENTO) {
                if (!melhorMatch || distancia < melhorMatch.distancia) {
                    melhorMatch = { matricula, distancia };
                }
            }
        }
    }

    return melhorMatch;
}

/**
 * Serializa descritores para armazenamento (IndexedDB / API).
 * Converte Float32Array[] -> number[][] (JSON-serializavel).
 */
export function serializarDescritores(descritores: Float32Array[]): number[][] {
    return descritores.map(d => Array.from(d));
}

/**
 * Desserializa descritores do armazenamento.
 * Converte number[][] -> Float32Array[].
 */
export function desserializarDescritores(dados: number[][]): Float32Array[] {
    return dados.map(d => new Float32Array(d));
}

/**
 * Retorna a quantidade de alunos com descritores no cache.
 */
export function totalAlunosCadastrados(): number {
    return cacheDescritores.size;
}

/**
 * Verifica se um aluno especifico tem descritor cadastrado.
 */
export function alunoTemDescritor(matricula: string): boolean {
    return cacheDescritores.has(matricula);
}

/**
 * Retorna os descritores de um aluno (para salvar no servidor).
 */
export function obterDescritores(matricula: string): Float32Array[] | undefined {
    return cacheDescritores.get(matricula);
}
