import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZamServe",
  description: "Local services. Real people. Book beauty, repairs, and cleaning across Zambia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="app-stage">
          <div className="app-frame flex flex-col">
            <AppHeader />
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
