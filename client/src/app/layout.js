import "./globals.css";

export const metadata = {
  title: "MIARUSH BONUSES | Premium Gaming Portal",
  description: "The ultimate destination for premium gaming, rewards, and premium casino bonuses.",
  icons: {
    icon: "/mia.png",
    apple: "/mia.png",
  }
};

import AdminPortal from "@/components/AdminPortal";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <AdminPortal />
        <ToastContainer 
          position="bottom-right"
          theme="dark"
          toastStyle={{ backgroundColor: '#11141b', border: '1px solid rgba(0, 242, 255, 0.2)', color: '#fff' }}
        />
      </body>
    </html>
  );
}
