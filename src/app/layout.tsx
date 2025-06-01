import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";

export const metadata: Metadata = {
  title: "AI Ticket Automation Chatbot",
  description: "Intelligent chatbot for automated ticket creation and development assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ToastProvider>
        {children}
        </ToastProvider>
      </body>
    </html>
  );
}
