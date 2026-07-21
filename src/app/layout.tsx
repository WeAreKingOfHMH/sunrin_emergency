import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "선린냥이 결제 정보 확인",
  description: "선린냥이 X HMH 후발주 현금 결제 확인 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
