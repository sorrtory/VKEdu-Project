import type { Metadata } from "next";
import '@excalidraw/excalidraw/index.css';
import "./globals.css";
import ThemeProvider from "../components/theme-provider";
import Header from "../components/common/header";
import { UserProvider } from "../contexts/UserContext";

export const metadata: Metadata = {
  title: "Broad Board",
  description: "Video conferencing with AI-powered assistance for education",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <UserProvider>
            <div className="min-h-screen flex flex-col bg-white dark:bg-background-grey">
              <Header />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
