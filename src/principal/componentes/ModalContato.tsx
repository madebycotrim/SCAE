import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Building, User, Phone, CheckCircle2 } from 'lucide-react';
import FocusTrap from 'focus-trap-react';

interface ModalContatoProps {
    aberto: boolean;
    aoFechar: () => void;
    temaEscuro: boolean;
}

export function ModalContato({ aberto, aoFechar, temaEscuro }: ModalContatoProps) {
    const [enviado, definirEnviado] = useState(false);
    const [nome, definirNome] = useState('');
    const [escola, definirEscola] = useState('');
    const [telefone, definirTelefone] = useState('');

    useEffect(() => {
        if (!aberto) return;

        const lidarComEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                aoFechar();
            }
        };

        // Trap focus e overflow hidden no body
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', lidarComEsc);

        if (aberto) definirEnviado(false);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', lidarComEsc);
        };
    }, [aberto, aoFechar]);

    const aoEnviar = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulação de envio
        setTimeout(() => {
            definirEnviado(true);
            setTimeout(() => {
                aoFechar();
            }, 3000);
        }, 800);
    };

    return (
        <AnimatePresence>
            {aberto && (
                <FocusTrap focusTrapOptions={{ initialFocus: false, allowOutsideClick: true }}>
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/40 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-contato-titulo"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0"
                            onClick={aoFechar}
                            aria-hidden="true"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`relative w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden flex flex-col 
                            ${temaEscuro ? 'bg-[#0B0F19] border-slate-700' : 'bg-white border-slate-100'}`}
                        >
                            {/* Header */}
                            <div className={`flex items-center justify-between p-6 border-b 
                            ${temaEscuro ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                                <div>
                                    <h2 id="modal-contato-titulo" className={`text-xl font-extrabold ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>Fale Conosco</h2>
                                    <p className={`text-sm mt-1 font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Implemente a inovação na sua escola.</p>
                                </div>
                                <button
                                    onClick={aoFechar}
                                    className={`p-2 rounded-xl transition-colors shadow-sm
                                    ${temaEscuro ? 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-200'}`}
                                    aria-label="Fechar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className={`p-6 md:p-8 ${temaEscuro ? 'bg-[#0B0F19]' : 'bg-white'}`}>
                                {enviado ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-8 text-center"
                                    >
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 
                                        ${temaEscuro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-500'}`}>
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h3 className={`text-2xl font-bold mb-2 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>Recebemos seu contato!</h3>
                                        <p className={`${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Nossa equipe entrará em contato com você ou com a escola em breve.</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={aoEnviar} className="space-y-5">
                                        <div>
                                            <label htmlFor="nome-contato" className={`block text-sm font-bold mb-1.5 ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>Seu Nome</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <User className={`w-5 h-5 ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`} />
                                                </div>
                                                <input
                                                    id="nome-contato"
                                                    type="text"
                                                    required
                                                    placeholder="Como podemos te chamar?"
                                                    value={nome}
                                                    onChange={(e) => definirNome(e.target.value)}
                                                    className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all
                                                    ${temaEscuro
                                                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-sky-500 focus:ring-sky-500/20'
                                                            : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500/20'}`}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="escola-contato" className={`block text-sm font-bold mb-1.5 ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>Nome da Escola</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Building className={`w-5 h-5 ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`} />
                                                </div>
                                                <input
                                                    id="escola-contato"
                                                    type="text"
                                                    required
                                                    placeholder="Instituição de ensino"
                                                    value={escola}
                                                    onChange={(e) => definirEscola(e.target.value)}
                                                    className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all
                                                    ${temaEscuro
                                                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-sky-500 focus:ring-sky-500/20'
                                                            : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500/20'}`}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="telefone-contato" className={`block text-sm font-bold mb-1.5 ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>Celular / WhatsApp</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className={`w-5 h-5 ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`} />
                                                </div>
                                                <input
                                                    id="telefone-contato"
                                                    type="tel"
                                                    required
                                                    placeholder="(00) 00000-0000"
                                                    value={telefone}
                                                    onChange={(e) => definirTelefone(e.target.value)}
                                                    className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all
                                                    ${temaEscuro
                                                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-sky-500 focus:ring-sky-500/20'
                                                            : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500/20'}`}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-sky-600/20 transition-all hover:shadow-sky-500/30 active:scale-[0.98]"
                                        >
                                            <Send className="w-5 h-5" />
                                            Enviar Solicitação
                                        </button>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </FocusTrap>
            )}
        </AnimatePresence>
    );
}

