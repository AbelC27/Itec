"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "itecify_active_doc";

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
        useState<string | null>(() => {
            if (typeof window === "undefined") {
                return null;
            }

            return window.localStorage.getItem(STORAGE_KEY);
        });
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
