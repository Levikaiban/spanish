export const metadata = { title: 'Spanish Racer', description: 'Spanish vocabulary racing game' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0f1e' }}>
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
