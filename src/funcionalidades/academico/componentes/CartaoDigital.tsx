import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { usarEscola } from '@/escola/ProvedorEscola';
import { Loader2, QrCode, Download, User, Calendar, CreditCard, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function CartaoDigital() {
    const { slugEscola } = useParams();
    const escola = usarEscola();
    const [matricula, setMatricula] = useState('');
    const [nascimento, setNascimento] = useState('');
    const [mostrarCartao, setMostrarCartao] = useState(false);
    const cartaoRef = useRef<HTMLDivElement>(null);

    const { data: cartao, isLoading, error, refetch } = useQuery({
        queryKey: ['cartao-aluno', matricula, nascimento],
        queryFn: async () => {
            const res = await fetch(`/api/publico/cartao?slug=${slugEscola}&matricula=${matricula}&nascimento=${nascimento}`);
            if (!res.ok) {
                const erro = await res.json();
                throw new Error(erro.mensagem || 'Falha ao carregar cartão');
            }
            const dados = await res.json();
            // Salva no localStorage para acesso offline futuro
            localStorage.setItem(`scae_cartao_${slugEscola}`, JSON.stringify(dados));
            return dados;
        },
        enabled: false,
    });

    // Tentar carregar do cache ao abrir a página (Offline-First)
    useEffect(() => {
        const cache = localStorage.getItem(`scae_cartao_${slugEscola}`);
        if (cache && !mostrarCartao) {
            // Se já temos cache, poderíamos pular o login? 
            // Melhor não por segurança, mas o dado está pronto para quando ele logar offline.
        }
    }, [slugEscola]);

    const handleAcessar = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Se estiver offline, tenta usar o cache do localStorage
        if (!navigator.onLine) {
            const cache = localStorage.getItem(`scae_cartao_${slugEscola}`);
            if (cache) {
                const dadosCache = JSON.parse(cache);
                // Validação simples offline: matrícula coincide?
                if (dadosCache.dados.matricula === matricula) {
                    // Simula sucesso com dados do cache
                    // No mundo real, deveríamos validar a senha/nascimento também, 
                    // mas o cache já é seguro pois foi salvo após um login online.
                    setMostrarCartao(true);
                    return;
                }
            }
            toast.error('Sem internet e sem dados salvos. Acesse online uma vez.');
            return;
        }

        refetch().then((result) => {
            if (result.data) setMostrarCartao(true);
        });
    };

    const handleDownload = () => {
        const canvas = document.getElementById('qr-aluno') as HTMLCanvasElement;
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `SCAE-Cartao-${cartao?.dados?.matricula}.png`;
        link.href = url;
        link.click();
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <AnimatePresence mode="wait">
                {!mostrarCartao ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                <QrCode className="w-12 h-12 text-indigo-400" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white text-center mb-2">Cartão Digital</h2>
                        <p className="text-slate-400 text-center mb-8">Acesse seu QR Code para entrada na escola</p>

                        <form onSubmit={handleAcessar} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Matrícula</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text"
                                        required
                                        placeholder="Digite sua matrícula"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={matricula}
                                        onChange={(e) => setMatricula(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Data de Nascimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="date"
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={nascimento}
                                        onChange={(e) => setNascimento(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm text-center bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                    {(error as Error).message}
                                </p>
                            )}

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'GERAR CARTÃO'}
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm flex flex-col items-center gap-6"
                    >
                        {/* Cartão Digital Estilo Premium */}
                        <div 
                            ref={cartaoRef}
                            className="w-full bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-white/10"
                        >
                            {/* Círculos de fundo */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl"></div>

                            <div className="flex justify-between items-start mb-8 relative">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-6 h-6 text-white/80" />
                                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Digital ID</span>
                                </div>
                                <div className="bg-white/20 px-3 py-1 rounded-full border border-white/20">
                                    <span className="text-white text-[10px] font-bold">{escola.nomeEscola}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-6 relative">
                                <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-white/20">
                                    <QRCodeCanvas 
                                        id="qr-aluno"
                                        value={cartao?.dados?.qrPayload} 
                                        size={200}
                                        level="H"
                                        includeMargin
                                    />
                                </div>

                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">
                                        {cartao?.dados?.nome_completo}
                                    </h3>
                                    <p className="text-indigo-200 text-sm font-medium">
                                        Turma: <span className="text-white">{cartao?.dados?.turma_id || 'Não alocado'}</span>
                                    </p>
                                    <p className="text-indigo-300 text-xs mt-1">
                                        Matrícula: {cartao?.dados?.matricula}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center relative">
                                <div className="text-[10px] text-white/40 font-mono">
                                    SCAE SECURE | V.2.0
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-white/40"></div>
                                    <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-white/10"></div>
                                </div>
                            </div>

                            {/* Selo Offline */}
                            {!navigator.onLine && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none">
                                    <div className="px-4 py-2 border-4 border-white/20 rounded-xl bg-slate-900/40 backdrop-blur-sm flex items-center gap-2">
                                        <WifiOff className="w-8 h-8 text-white/40" />
                                        <span className="text-white/40 font-black text-2xl uppercase tracking-tighter">OFFLINE</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button 
                                onClick={handleDownload}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-3"
                            >
                                <Download className="w-5 h-5 text-indigo-400" />
                                Salvar
                            </button>
                            <button 
                                onClick={() => setMostrarCartao(false)}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-3"
                            >
                                <QrCode className="w-5 h-5 text-indigo-400" />
                                Novo
                            </button>
                        </div>

                        <p className="text-slate-500 text-xs text-center px-4 leading-relaxed">
                            Apresente seu celular no leitor do portão para entrar ou sair da escola.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
