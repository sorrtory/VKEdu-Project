"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";


export default function ThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {

    return (
        <NextThemesProvider
            defaultTheme="system"
            attribute="class"
        >
            {children}
        </NextThemesProvider>
    )
}

