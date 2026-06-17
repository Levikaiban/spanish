export const metadata = { title: 'SpeedEspañol', description: 'Learn Spanish fast!' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#070714' }}>{children}</body>
    </html>
  );
}
