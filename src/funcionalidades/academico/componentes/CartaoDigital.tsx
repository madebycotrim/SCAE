import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { usarEscola } from '@/escola/ProvedorEscola';
import { Loader2, QrCode, Download, User, Calendar, CreditCard, WifiOff, ShieldCheck, ScanLine, Fingerprint, Check, Building2, ChevronLeft, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function CartaoDigital() {
    const { slugEscola } = useParams();
    const navegar = useNavigate();
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
            localStorage.setItem(`scae_cartao_${slugEscola}`, JSON.stringify(dados));
            return dados;
        },
        enabled: false,
    });

    useEffect(() => {
        let intervalo: any;
        if (mostrarCartao && cartao?.dados?.qrDinamico && navigator.onLine) {
            intervalo = setInterval(() => {
                refetch();
            }, 15000);
        }
        return () => clearInterval(intervalo);
    }, [mostrarCartao, cartao?.dados?.qrDinamico, refetch]);

    const handleAcessar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!navigator.onLine) {
            const cache = localStorage.getItem(`scae_cartao_${slugEscola}`);
            if (cache) {
                const dadosCache = JSON.parse(cache);
                if (dadosCache.dados.matricula === matricula) {
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
        <div 
            className="flex min-h-screen w-full font-sans overflow-hidden bg-slate-50"
            style={{
                backgroundImage: 'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}
        >
            <div className="flex-1 flex items-center justify-center p-5 md:p-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[1000px] rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px] bg-white"
                    style={{ boxShadow: '0 32px 64px rgba(6,13,31,0.18), 0 0 0 1px rgba(15,23,42,0.06)' }}
                >
                    {/* ─── PAINEL ESQUERDO (Mesmo estilo do Login de Equipe) ─── */}
                    <div 
                        className="md:w-[52%] p-14 relative flex flex-col justify-between overflow-hidden"
                        style={{ background: 'linear-gradient(145deg, #060d1f 0%, #0a1628 60%, #0d1f3c 100%)' }}
                    >
                        <div className="absolute top-[10%] right-[8%] opacity-[0.05]">
                            <QrCode className="w-28 h-28 text-white" strokeWidth={1} />
                        </div>
                        <div className="absolute bottom-[12%] right-[5%] opacity-[0.04] rotate-12">
                            <ScanLine className="w-20 h-20 text-white" strokeWidth={1} />
                        </div>
                        <div className="absolute top-[48%] right-[25%] opacity-[0.03] -rotate-6">
                            <Fingerprint className="w-16 h-16 text-white" strokeWidth={1} />
                        </div>

                        {/* Logo SCAE */}
                        <div className="relative z-10 flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-white/[0.08] border border-white/[0.12]">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">SCAE<span className="text-sky-400">.</span></span>
                        </div>

                        {/* Conteúdo Central */}
                        <div className="relative z-10 space-y-7 my-auto">
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.15]">
                                <Building2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-200 uppercase tracking-[0.15em]">{escola.nomeEscola}</span>
                            </div>

                            <div>
                                <h2 className="text-[2rem] md:text-[2.1rem] font-black text-white leading-[1.15] tracking-tight">
                                    Olá, Estudante!<br />
                                    Tudo pronto para entrar?
                                </h2>
                                <p className="text-slate-400 text-[15px] leading-relaxed mt-3 max-w-[20rem]">
                                    Gere seu QR Code institucional e apresente-o no terminal para validar sua entrada ou saída.
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                    <span className="text-[13px] text-slate-300">
                                        {escola.qrDinamico ? 'QR Code Dinâmico e Seguro' : 'QR Code Fixo e Persistente'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                    <span className="text-[13px] text-slate-300">Acesso rápido via matrícula</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                    <span className="text-[13px] text-slate-300">
                                        {escola.qrDinamico ? 'Renovação anti-fraude' : 'Funciona 100% Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Rodapé Interno */}
                        <div className="relative z-10">
                            <button 
                                onClick={() => navegar('/')}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1] transition-all"
                            >
                                <ChevronLeft className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Voltar à escola</span>
                            </button>
                        </div>
                    </div>

                    {/* ─── PAINEL DIREITO (Formulário ou Cartão) ─── */}
                    <div className="md:w-[48%] flex flex-col items-center justify-center bg-white relative p-10">
                        <AnimatePresence mode="wait">
                            {!mostrarCartao ? (
                                <motion.div 
                                    key="login-aluno"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="w-full max-w-[280px]"
                                >
                                    <div className="text-center mb-8">
                                        <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center mx-auto mb-4 bg-slate-100 border border-slate-200">
                                            <GraduationCap className="w-6 h-6 text-slate-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Acesso do Aluno</h3>
                                        <p className="text-slate-500 text-sm font-medium mt-1.5 leading-relaxed">
                                            Identifique-se para visualizar <br />seu Cartão Digital SCAE
                                        </p>
                                    </div>

                                    <form onSubmit={handleAcessar} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matrícula</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="text"
                                                    required
                                                    value={matricula}
                                                    onChange={(e) => setMatricula(e.target.value)}
                                                    placeholder="Digite sua matrícula"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-slate-800 text-sm font-bold focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="date"
                                                    required
                                                    value={nascimento}
                                                    onChange={(e) => setNascimento(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-slate-800 text-sm font-bold focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black rounded-2xl text-center uppercase tracking-tight">
                                                {(error as Error).message}
                                            </div>
                                        )}

                                        <button 
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-[#0d1f3c] hover:bg-[#0a1628] text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-suave hover:shadow-media transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'GERAR CARTÃO'}
                                        </button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="cartao-visual"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full flex flex-col items-center gap-6"
                                >
                                    <div 
                                        ref={cartaoRef}
                                        className="w-full max-w-[300px] bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-white/10"
                                    >
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                                        <div className="flex justify-between items-start mb-6 relative">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-5 h-5 text-white/80" />
                                                <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">Digital ID</span>
                                            </div>
                                            <div className="bg-white/20 px-2 py-1 rounded-lg border border-white/20">
                                                <span className="text-white text-[8px] font-black truncate max-w-[100px] block">{escola.nomeEscola}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-5 relative z-10">
                                            <div className="bg-white p-3 rounded-2xl shadow-sm border-2 border-white/20">
                                                <QRCodeCanvas 
                                                    id="qr-aluno"
                                                    value={cartao?.dados?.qrPayload} 
                                                    size={160}
                                                    level="H"
                                                    includeMargin
                                                />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg font-black text-white mb-0.5 uppercase tracking-tight">
                                                    {cartao?.dados?.nome_completo}
                                                </h3>
                                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">
                                                    Turma: <span className="text-white">{cartao?.dados?.turma_id || '---'}</span>
                                                </p>
                                                {cartao?.dados?.qrDinamico && (
                                                    <div className="mt-2 flex items-center justify-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                                                        <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Código Dinâmico Ativo</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {!navigator.onLine && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] z-20 pointer-events-none">
                                                <div className="px-4 py-2 border-2 border-white/20 rounded-xl bg-slate-900/80 flex items-center gap-2 -rotate-12">
                                                    <WifiOff className="w-5 h-5 text-white/40" />
                                                    <span className="text-white/40 font-black text-xl uppercase tracking-tighter">OFFLINE</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status de Validação — Novo design premium */}
                                    <div className="w-full max-w-[300px] p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cartao?.dados?.qrDinamico ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                            <ShieldCheck size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                {cartao?.dados?.qrDinamico ? 'Atualização em Tempo Real' : 'Acesso Persistente'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-600 leading-tight">
                                                {cartao?.dados?.qrDinamico 
                                                    ? 'Este código expira e se renova automaticamente para sua segurança.' 
                                                    : 'Este código é fixo e ideal para locais com pouco sinal de internet.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 w-full max-w-[300px]">
                                        <button 
                                            onClick={handleDownload}
                                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl transition-all border border-slate-200 flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Salvar
                                        </button>
                                        <button 
                                            onClick={() => setMostrarCartao(false)}
                                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl transition-all border border-slate-200 flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <QrCode className="w-3.5 h-3.5" /> Novo
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <div className="absolute bottom-4 right-6 z-20">
                    <span className="text-[10px] font-bold text-slate-400 transition-opacity uppercase tracking-[0.3em] opacity-10 cursor-default select-none">
                        SCAE v 3.0
                    </span>
                </div>
            </div>
        </div>
    );
}
