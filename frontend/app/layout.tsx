import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

export const metadata: Metadata = {
  title: "Warcast | X Layer Intelligence",
  description: "Autonomous AI commanders detecting real-time tactical World Cup events.",
  icons: {
    icon: "/warcast-mark.svg",
    shortcut: "/warcast-mark.svg",
    apple: "/warcast-avatar.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
