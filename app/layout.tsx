import type { Metadata } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { UserInitializer } from "./components/UserInitializer";
import { ToastProvider } from "./components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Daily Family - Family Schedule Assistant",
  description: "Never miss a kid's activity again with Our Daily Family",
};

// Force dynamic rendering to avoid build-time environment variable issues
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ConvexClientProvider>
          <ToastProvider>
            <UserInitializer>{children}</UserInitializer>
          </ToastProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
