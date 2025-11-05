import type { Metadata } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { UserInitializer } from "./components/UserInitializer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Daily Family - Family Schedule Assistant",
  description: "Never miss a kid's activity again with Our Daily Family",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <UserInitializer>{children}</UserInitializer>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
