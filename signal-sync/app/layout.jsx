import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { LanguageProvider } from '@/components/LanguageProvider';
import LanguagePicker from '@/components/LanguagePicker';
import Chatbot from '@/components/Chatbot';

export const metadata = {
    title: 'SignalSync | AI-Powered Intelligent Traffic Management',
    description:
        'SignalSync uses AI vision, dynamic signal optimization, and verified green corridors to save lives, secure convoys, and reduce urban congestion.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body suppressHydrationWarning className="bg-bg-deep text-text-primary font-sans overflow-x-hidden min-h-screen">
                <LanguageProvider>
                    <LanguagePicker />
                    <AuthProvider>
                        {children}
                        <Chatbot />
                    </AuthProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}


