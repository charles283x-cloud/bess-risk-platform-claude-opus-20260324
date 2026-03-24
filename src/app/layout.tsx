import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "储能项目风控平台",
  description: "储能项目签约前/开工前风险检查管理平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
