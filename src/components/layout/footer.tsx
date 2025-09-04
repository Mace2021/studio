
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
    const pathname = usePathname();
    const isDashboard = pathname === '/';

    // Don't show the footer on the main dashboard page where it might interfere with the UI
    if (isDashboard) {
        return null;
    }

    return (
        <footer className="p-4 bg-background/50 border-t">
            <div className="container mx-auto flex justify-center items-center gap-4 text-sm text-muted-foreground">
                <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
                <span>&bull;</span>
                <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            </div>
        </footer>
    );
}
