"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // No disableTransitionOnChange: globals.css fades themed
      // properties over .6s, which is the wanted cross-fade effect.
    >
      {children}
    </NextThemesProvider>
  );
}
