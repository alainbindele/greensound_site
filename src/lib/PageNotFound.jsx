import { Link, useLocation } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/kit';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-24">
            <div className="aurora-field" aria-hidden="true" />

            <SpotlightCard interactive={false} className="relative z-10 w-full max-w-lg">
                <div className="p-10 text-center md:p-12">
                    <span className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 ring-1 ring-inset ring-brand/25">
                        <Compass className="h-6 w-6 text-brand" aria-hidden="true" />
                    </span>

                    <p className="text-gradient-bio font-display text-6xl font-black">404</p>
                    <div className="hairline mx-auto my-6 w-32" aria-hidden="true" />

                    <h1 className="mb-3 text-2xl font-semibold">Pagina non trovata</h1>
                    <p className="text-muted-foreground">
                        {pageName ? (
                            <>
                                La pagina{' '}
                                <span className="break-all font-mono text-sm text-foreground">
                                    /{pageName}
                                </span>{' '}
                                non esiste.
                            </>
                        ) : (
                            'Questa pagina non esiste.'
                        )}
                    </p>

                    <Button
                        asChild
                        size="lg"
                        className="mt-8 rounded-full bg-brand-solid text-primary-foreground shadow-glow hover:bg-brand-solid/90"
                    >
                        <Link to="/">
                            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                            Torna alla home
                        </Link>
                    </Button>
                </div>
            </SpotlightCard>
        </div>
    );
}
