'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Filters {
    period: string;
    companyId: string;
    accountId: string;
    startDate?: string;
    endDate?: string;
}

const STORAGE_KEY = 'finance-ai-filters';

const DEFAULT_FILTERS: Filters = {
    period: 'all',
    companyId: 'all',
    accountId: 'all',
};

export function usePersistedFilters() {
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFilters(parsed);
            } catch (e) {
                console.error('Error parsing filters from localStorage', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage when filters change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));

            // Notify other tabs/windows if needed (though within the same SPA it's fine)
            window.dispatchEvent(new Event('storage-filters-updated'));
        }
    }, [filters, isLoaded]);

    // Listen for changes from other components (if we want real-time sync across pages without navigation)
    useEffect(() => {
        const handleStorageUpdate = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setFilters(prev => {
                        // Only update if different to avoid cycles
                        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                            return parsed;
                        }
                        return prev;
                    });
                } catch (e) {
                    console.error('Error parsing filters from localStorage listener', e);
                }
            }
        };

        window.addEventListener('storage-filters-updated', handleStorageUpdate);
        return () => window.removeEventListener('storage-filters-updated', handleStorageUpdate);
    }, []);

    const setFilterValue = useCallback((key: keyof Filters, value: string | undefined) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };

            // If period changes and is not custom, clear dates
            if (key === 'period' && value !== 'custom') {
                delete newFilters.startDate;
                delete newFilters.endDate;
            }

            return newFilters;
        });
    }, []);

    const setManyFilters = useCallback((updates: Partial<Filters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    }, []);

    return {
        filters,
        setFilters: setManyFilters,
        setFilterValue,
        isLoaded
    };
}
