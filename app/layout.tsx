import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinanceAI - Gestão Financeira Inteligente",
  description: "Sistema de gestão financeira com IA para categorização automática de transações",
};

import { QueryClientProviderWrapper } from "@/components/providers/query-client-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProviderWrapper>
            <MainLayout>
              {children}
            </MainLayout>
          </QueryClientProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
