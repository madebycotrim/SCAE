interface SEOProps {
    titulo: string;
    descricao?: string;
}

export function SEO({ titulo, descricao }: SEOProps) {
    return (
        <>
            <title>{titulo}</title>
            {descricao && <meta name="description" content={descricao} />}
        </>
    );
}
