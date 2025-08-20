"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Info, Mail, LogIn, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "../ui/button";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Mail },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-semibold font-headline">DataSight</h1>
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
      <SidebarFooter className="mt-auto">
        <SidebarMenu>
           {user ? (
             <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut} className="w-full">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                </SidebarMenuButton>
             </SidebarMenuItem>
           ) : (
            <>
              <SidebarMenuItem>
                <Link href="/login">
                    <SidebarMenuButton isActive={pathname === '/login'} className="w-full">
                        <LogIn className="h-4 w-4" />
                        <span>Login</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/signup">
                    <SidebarMenuButton isActive={pathname === '/signup'} className="w-full">
                        <UserPlus className="h-4 w-4" />
                        <span>Sign Up</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </>
           )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
