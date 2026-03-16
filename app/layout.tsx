import "./globals.css";

export const metadata = {
  title: "Morek 360 Depot",
  description: "Robotics & AI Investment Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}