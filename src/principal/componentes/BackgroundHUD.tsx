import { motion } from 'framer-motion';

interface Props {
    temaEscuro: boolean;
}

/**
 * Componente de fundo dinâmico com HUD tecnológico, gradientes atmosféricos e partículas.
 */
export const BackgroundHUD = ({ temaEscuro }: Props) => {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Gradiente de Profundidade */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${temaEscuro ? 'bg-gradient-to-b from-marinho via-[#050A1A] to-marinho opacity-100' : 'bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC] opacity-100'}`} />
            
            {/* Tech Grid HUD */}
            <div className="absolute inset-0"
                style={{
                    backgroundImage: temaEscuro
                        ? 'radial-gradient(circle at 2px 2px, rgba(43, 89, 255, 0.08) 1px, transparent 0)'
                        : 'radial-gradient(circle at 2px 2px, rgba(15, 23, 42, 0.03) 1px, transparent 0)',
                    backgroundSize: '48px 48px'
                }}>
            </div>

            {/* Brilhos Atmosféricos Dinâmicos */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.15, 0.25, 0.15],
                    x: [0, 100, 0],
                    y: [0, -50, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute -top-[10%] -left-[10%] w-[70%] h-[70%] blur-[180px] rounded-full ${temaEscuro ? 'bg-eletrico/20' : 'bg-eletrico/10'}`}
            />
            <motion.div 
                animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.1, 0.2, 0.1],
                    x: [0, -80, 0],
                    y: [0, 80, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] blur-[160px] rounded-full ${temaEscuro ? 'bg-eletrico/15' : 'bg-indigo-200/20'}`}
            />

            {/* Partículas de Dados Flutuantes */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -100, 0],
                        opacity: [0, 0.4, 0],
                        scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{
                        duration: 10 + i * 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 1.5
                    }}
                    className={`absolute w-1 h-1 rounded-full ${temaEscuro ? 'bg-eletrico/40 shadow-[0_0_8px_rgba(43,89,255,0.5)]' : 'bg-slate-300'}`}
                    style={{
                        left: `${15 + i * 15}%`,
                        top: `${20 + (i % 3) * 25}%`
                    }}
                />
            ))}
        </div>
    );
};
