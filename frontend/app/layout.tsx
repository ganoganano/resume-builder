import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "職務経歴管理システム",
  description: "職務経歴データ編集とPDF出力",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Sidebar />
        <main className="md:ml-56 p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
