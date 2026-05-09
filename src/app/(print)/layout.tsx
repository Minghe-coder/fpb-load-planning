export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, Arial, sans-serif; background: white; color: #111; }
          @media print {
            .no-print { display: none !important; }
            @page { margin: 1.5cm; size: A4; }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
