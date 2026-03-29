"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";
import {
    Bug,
    ChevronLeft,
    ChevronRight,
    Code2,
    Home,
    LifeBuoy,
    LogOut,
    Menu,
    Settings,
    User,
    X,
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

type SidebarContentProps = {
    collapsed: boolean;
    isMobile: boolean;
    pathname: string;
    onClose?: () => void;
    onToggleCollapse?: () => void;
    onSignOut: () => Promise<void>;
};

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";
const SIDEBAR_COLLAPSE_KEY = "sidebar-collapsed";
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(",");

const primaryNav: NavItem[] = [
    { href: "/homepage", label: "Home", icon: Home },
    { href: "/workspace", label: "Workspace", icon: Code2 },
    { href: "/debugging", label: "Debugging", icon: Bug },
    { href: "/profile", label: "Profile", icon: User },
];

const secondaryNav: NavItem[] = [
    { href: "#", label: "Settings", icon: Settings },
    { href: "#", label: "Support", icon: LifeBuoy },
];

function SidebarContent({
    collapsed,
    isMobile,
    pathname,
    onClose,
    onToggleCollapse,
    onSignOut,
}: SidebarContentProps) {
    return (
        <div className="flex h-full flex-col px-3 py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                {isMobile ? (
                    <>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                Navigation
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                                iTECity Workspace
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-accent hover:text-accent-foreground"
                            aria-label="Close navigation menu"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>

            <div className="rounded-xl border border-border bg-card px-3 py-3">
                {!collapsed ? (
                    <>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                            Project Alpha
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Collaborative Mode
                        </div>
                    </>
                ) : (
                    <span className="flex justify-center">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                )}
            </div>

            <nav
                aria-label="Primary navigation"
                className="mt-6 space-y-1"
            >
                {primaryNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={onClose}
                            aria-current={isActive ? "page" : undefined}
                            aria-label={collapsed ? item.label : undefined}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-[250ms] ${
                                isActive
                                    ? "bg-accent text-accent-foreground"
                                    : "text-slate-400 hover:bg-accent hover:text-accent-foreground"
                            } ${collapsed ? "justify-center" : ""}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {collapsed ? (
                                <span className="sr-only">{item.label}</span>
                            ) : (
                                item.label
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-4">
                <nav
                    aria-label="Secondary navigation"
                    className="space-y-1"
                >
                    {secondaryNav.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={onClose}
                                aria-label={collapsed ? item.label : undefined}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors duration-[250ms] hover:bg-accent hover:text-accent-foreground ${
                                    collapsed ? "justify-center" : ""
                                }`}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {collapsed ? (
                                    <span className="sr-only">{item.label}</span>
                                ) : (
                                    item.label
                                )}
                            </Link>
                        );
                    })}

                    <button
                        type="button"
                        onClick={async () => {
                            onClose?.();
                            await onSignOut();
                        }}
                        aria-label={collapsed ? "Log out" : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors duration-[250ms] hover:bg-accent hover:text-destructive ${
                            collapsed ? "justify-center" : ""
                        }`}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {collapsed ? (
                            <span className="sr-only">Log Out</span>
                        ) : (
                            "Log Out"
                        )}
                    </button>
                </nav>
            </div>
        </div>
    );
}

export default function ObsidianLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const mobileDrawerRef = useRef<HTMLElement | null>(null);
    const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }

        return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true";
    });
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    const currentSection =
        primaryNav.find((item) => pathname === item.href)?.label ?? "Workspace";

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);
        const syncViewport = (matches: boolean) => {
            setIsDesktop(matches);
            if (matches) {
                setIsMobileOpen(false);
            }
        };

        syncViewport(mediaQuery.matches);

        const handleViewportChange = (event: MediaQueryListEvent) => {
            syncViewport(event.matches);
        };

        mediaQuery.addEventListener("change", handleViewportChange);

        return () => {
            mediaQuery.removeEventListener("change", handleViewportChange);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(
            SIDEBAR_COLLAPSE_KEY,
            String(isCollapsed)
        );
    }, [isCollapsed]);

    useEffect(() => {
        // Keep the mobile drawer in sync with navigation changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isMobileOpen || isDesktop) {
            return undefined;
        }

        const drawer = mobileDrawerRef.current;
        if (!drawer) {
            return undefined;
        }

        const previousActiveElement =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const mobileMenuButton = mobileMenuButtonRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const getFocusableElements = () =>
            Array.from(
                drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter((element) => {
                if (element.getAttribute("aria-hidden") === "true") {
                    return false;
                }

                return (
                    element.offsetWidth > 0 ||
                    element.offsetHeight > 0 ||
                    element.getClientRects().length > 0
                );
            });

        const initialFocusTarget = getFocusableElements()[0] ?? drawer;
        window.setTimeout(() => {
            initialFocusTarget.focus();
        }, 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setIsMobileOpen(false);
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) {
                event.preventDefault();
                drawer.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;

            if (event.shiftKey) {
                if (activeElement === firstElement || activeElement === drawer) {
                    event.preventDefault();
                    lastElement.focus();
                }
                return;
            }

            if (activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;

            if (
                previousActiveElement &&
                document.contains(previousActiveElement)
            ) {
                previousActiveElement.focus();
                return;
            }

            mobileMenuButton?.focus();
        };
    }, [isDesktop, isMobileOpen]);

    async function handleSignOut() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <aside
                aria-label="Primary sidebar"
                className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-background transition-[width] duration-[250ms] lg:block ${
                    isCollapsed ? "w-16" : "w-64"
                }`}
            >
                <SidebarContent
                    collapsed={isCollapsed}
                    isMobile={false}
                    pathname={pathname}
                    onToggleCollapse={() =>
                        setIsCollapsed((previousState) => !previousState)
                    }
                    onSignOut={handleSignOut}
                />
            </aside>

            <div
                aria-hidden={!isMobileOpen}
                className={`fixed inset-0 z-40 bg-slate-950/70 transition-opacity duration-[250ms] lg:hidden ${
                    isMobileOpen
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                }`}
                onClick={() => setIsMobileOpen(false)}
            />

            <aside
                id="mobile-navigation-drawer"
                ref={mobileDrawerRef}
                role="dialog"
                aria-modal="true"
                aria-label="Mobile navigation"
                aria-hidden={!isMobileOpen}
                tabIndex={-1}
                className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] border-r border-border bg-background shadow-2xl transition-transform duration-[250ms] lg:hidden ${
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <SidebarContent
                    collapsed={false}
                    isMobile
                    pathname={pathname}
                    onClose={() => setIsMobileOpen(false)}
                    onSignOut={handleSignOut}
                />
            </aside>

            <div
                className={`flex min-h-screen flex-1 flex-col bg-background transition-[margin] duration-[250ms] ${
                    isCollapsed ? "lg:ml-16" : "lg:ml-64"
                }`}
            >
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            ref={mobileMenuButtonRef}
                            type="button"
                            aria-label="Open navigation menu"
                            aria-expanded={isMobileOpen}
                            aria-controls="mobile-navigation-drawer"
                            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsMobileOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                iTECity
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                {currentSection}
                            </p>
                        </div>
                    </div>
                </header>

                <main
                    id="obsidian-main-content"
                    className="relative flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
                >
                    <div className="relative">{children}</div>
                </main>
            </div>
        </div>
    );
}
