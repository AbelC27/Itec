"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "activeDocumentId";

type ActiveDocumentContextType = {
    activeDocumentId: string | null;
    setActiveDocumentId: (id: string | null) => void;
    isReady: boolean;
};

const ActiveDocumentContext = createContext<ActiveDocumentContextType>({
    activeDocumentId: null,
    setActiveDocumentId: () => { },
    isReady: false,
});

export function ActiveDocumentProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [activeDocumentId, setActiveDocumentIdState] =
        useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setActiveDocumentIdState(stored);
        }
        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!isReady) return;
        if (activeDocumentId) {
            window.localStorage.setItem(STORAGE_KEY, activeDocumentId);
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, [activeDocumentId, isReady]);

    const value = useMemo(
        () => ({
            activeDocumentId,
            setActiveDocumentId: setActiveDocumentIdState,
            isReady,
        }),
        [activeDocumentId, isReady]
    );

    return (
        <ActiveDocumentContext.Provider value={value}>
            {children}
        </ActiveDocumentContext.Provider>
    );
}

export function useActiveDocument() {
    return useContext(ActiveDocumentContext);
}
