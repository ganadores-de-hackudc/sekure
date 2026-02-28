import { useState, useMemo } from 'react';
import { Globe } from 'lucide-react';

export default function Favicon({ url, className = "w-6 h-6" }: { url: string; className?: string }) {
    const [error, setError] = useState(false);

    const domain = useMemo(() => {
        if (!url) return null;
        try {
            const urlStr = url.startsWith('http') ? url : `https://${url}`;
            return new URL(urlStr).hostname;
        } catch {
            return null;
        }
    }, [url]);

    if (!domain || error) {
        return <Globe className={`${className} text-gray-400 flex-shrink-0`} />;
    }

    return (
        <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt={`${domain} icon`}
            className={`${className} rounded-sm object-contain flex-shrink-0`}
            onError={() => setError(true)}
        />
    );
}
