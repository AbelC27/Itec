"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark";
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}

// Re-export useTheme hook for convenience
export { useTheme } from "next-themes";
