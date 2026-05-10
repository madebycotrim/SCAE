import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Props {
    temaEscuro: boolean;
}

/**
 * Seção de perguntas frequentes (FAQ) com efeito de acordeão e animações.
 */
export const SecaoFAQ = ({ temaEscuro }: Props) => {
    const faqs = [
        {
            p: 'É gratuito para escolas públicas?',
            r: 'Sim. O projeto possui licença gratuita garantida para implantação em escolas públicas estaduais e municipais.'
        },
        {
            p: 'Precisa de internet para funcionar?',
            r: 'Não na portaria. O terminal de leitura opera 100% offline e sincroniza os registros automaticamente quando a rede volta.'
        },
        {
            p: 'Posso escolher o tipo de leitura?',
            r: 'Sim! O gestor configura no painel se deseja operar com biometria, QR Code Digital ou ambos simultaneamente.'
        },
        {
            p: 'Qual a URL de acesso do gestor?',
            r: 'O acesso administrativo centralizado é feito através do portal exclusivo catraki.com.br, com autenticação segura e simplificada.'
        }
    ];

    return (
        <section className={`relative z-20 w-full py-24 border-t ${temaEscuro ? 'bg-[#0B0F19]/60 border-slate-800/60' : 'bg-slate-50/50 border-slate-200/60'}`}>
            <div className="max-w-4xl mx-auto px-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className={`text-4xl font-extrabold mb-4 ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                        Perguntas Frequentes
                    </h2>
                    <p className={`text-lg font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                        Tudo o que você precisa saber antes de implantar o Catraki
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    className="max-w-3xl mx-auto flex flex-col gap-4 text-left"
                >
                    {faqs.map((faq, index) => (
                        <details key={index} className={`group rounded-2xl border transition-all ${temaEscuro ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <summary className={`flex justify-between items-center font-bold cursor-pointer list-none p-6 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'} [&::-webkit-details-marker]:hidden`}>
                                <span className="text-lg">{faq.p}</span>
                                <span className={`transition-transform duration-300 group-open:rotate-180 ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </span>
                            </summary>
                            <p className={`text-sm font-medium leading-relaxed px-6 pb-6 pt-0 ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                {faq.r}
                            </p>
                        </details>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

