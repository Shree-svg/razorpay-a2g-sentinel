import "./globals.css";
import { AuditProvider } from "@/contexts/AuditContext";

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
    <html lang="en" className="h-full bg-bitBg text-slate-100">
      <body className="h-full antialiased selection:bg-bitPrimary selection:text-white">
        <AuditProvider>{children}</AuditProvider>
      </body>
    </html>
  );
}
