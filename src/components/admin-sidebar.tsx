"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  Image,
  PenTool,
  Menu,
  Palette,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Admin", href: "/admin", icon: Settings },
  { label: "Direction Artistique", href: "/admin/brand", icon: Palette },
  { label: "Rédaction", href: "/admin/redaction", icon: PenTool },
  { label: "Blog", href: "/admin/blog", icon: FileText },
  { label: "Facebook", href: "/admin/facebook", icon: Facebook },
  { label: "Prompts", href: "/admin/prompts", icon: MessageSquare },
  { label: "Config IA", href: "/admin/ai-config", icon: Image },
  { label: "Paramètres", href: "/admin/settings", icon: Settings },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold">SocialGen</span>
            </div>
            <NavLinks onClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card p-4">
        <div className="mb-6 px-2">
          <Link href="/" className="text-lg font-bold tracking-tight">
            SocialGen
          </Link>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
