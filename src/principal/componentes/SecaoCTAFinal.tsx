interface Props {
    temaEscuro: boolean;
    aoAbrirModalContato: () => void;
}

/**
 * Seção de chamada para ação (CTA) final no rodapé da página.
 */
export const SecaoCTAFinal = ({ temaEscuro, aoAbrirModalContato }: Props) => {
    return (
        <section className={`relative z-20 w-full py-20 ${temaEscuro ? 'bg-[#0a1628]' : 'bg-[#0d1f3c]'}`}>
            <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-8 text-white">
                    Pronto para elevar o nível de segurança da sua escola?
                </h2>
                <button
                    onClick={aoAbrirModalContato}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all bg-transparent text-white border-2 border-white/20 hover:border-white/40 hover:bg-white/10 active:scale-95"
                >
                    Fale conosco
                </button>
            </div>
        </section>
    );
};
