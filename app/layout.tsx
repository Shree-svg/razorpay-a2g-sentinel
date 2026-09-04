import "./globals.css";

import { AuditProvider } from "@/contexts/AuditContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

export const metadata = {
  title: "Project B.I.T. — Bounded Intent Tokens",
  description: "Enterprise-grade agentic security gateway demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-rzp-bg text-rzp-text font-sans">
      <body className="h-full antialiased selection:bg-rzp-blue selection:text-white">
        <SettingsProvider>
          <AuditProvider>{children}</AuditProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
