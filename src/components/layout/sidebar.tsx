
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info, Mail, Lightbulb, LogIn, UserPlus, LogOut, GanttChart } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/gantt", label: "Gantt Chart", icon: GanttChart },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/tutorial", label: "Tutorial", icon: Lightbulb },
];

const authLinks = [
    { href: "/login", label: "Login", icon: LogIn },
    { href: "/signup", label: "Sign Up", icon: UserPlus },
]

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-center p-2">
           <Image src="/logo.png" alt="Visual Dashboard Logo" width={150} height={50} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href}>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  className="w-full"
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="mt-auto p-2">
        <SidebarMenu>
            {!user ? (
                authLinks.map((link) => (
                    <SidebarMenuItem key={link.href}>
                        <Link href={link.href}>
                            <SidebarMenuButton
                            isActive={pathname === link.href}
                            className="w-full"
                            >
                            <link.icon className="h-4 w-4" />
                            <span>{link.label}</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))
            ) : (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={signOut}
                        className="w-full"
                        >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
