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
import { AuthProvider } from "@/components/providers/session-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { ThemeProvider } from "next-themes";
// Tutorial desativado temporariamente devido a bugs
// import { TutorialProvider } from "@/components/tutorial";
import { TransactionDetailsProvider } from "@/components/providers/transaction-details-provider";

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
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryClientProviderWrapper>
              <TransactionDetailsProvider>
                <MainLayout>
                  {children}
                </MainLayout>
              </TransactionDetailsProvider>
            </QueryClientProviderWrapper>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
