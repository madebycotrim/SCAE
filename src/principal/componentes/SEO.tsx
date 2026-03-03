import { Helmet } from 'react-helmet-async';

interface SEOProps {
    titulo: string;
    descricao?: string;
}

export function SEO({ titulo, descricao }: SEOProps) {
    return (
        <Helmet>
            <title>{titulo}</title>
            {descricao && <meta name="description" content={descricao} />}
        </Helmet>
    );
}
