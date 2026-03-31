import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import ThemeProvider from "../components/theme-provider";
import Header from "../components/common/header";

export const metadata: Metadata = {
  title: "Broad Board",
  description: "Video conferencing with AI-powered assistance for education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'} }catch(e){} })()`,
          }}
        />
        <ThemeProvider>
          <div className="min-h-screen flex flex-col bg-white dark:bg-background-grey">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
