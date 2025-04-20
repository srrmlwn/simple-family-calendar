import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        
        // Set initial value
        setMatches(media.matches);

        // Create listener function
        const listener = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        // Add listener
        media.addEventListener('change', listener);

        // Clean up
        return () => {
            media.removeEventListener('change', listener);
        };
    }, [query]);

    return matches;
}; 