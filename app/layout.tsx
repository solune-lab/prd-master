// Added React import to fix 'Cannot find namespace React' error.
import React from 'react';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // 確保您有這個檔案或整合原本的樣式
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PRD Master - 專業商務強化版',
  description: 'AI-powered PRD architect optimized for Edge runtime.',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className="dark">
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased overflow-hidden`}>
        {children}
      </body>
    </html>
  )
}
