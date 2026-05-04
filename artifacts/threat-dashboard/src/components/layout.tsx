import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { useLogout } from "@workspace/api-client-react";
import {
  Activity,
  Search,
  List,
  Bell,
  BookOpen,
  Users,
  FileText,
  LogOut,
  ChevronRight,
  Shield,
  Key,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TsedeyLogo } from "@/components/TsedeyLogo";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout: clearAuth } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => clearAuth(),
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Activity },
    { href: "/lookup", label: "Indicator Lookup", icon: Search },
    { href: "/scans", label: "Scan History", icon: List },
    { href: "/alerts", label: "Active Alerts", icon: Bell },
    { href: "/resources", label: "SOC Resources", icon: BookOpen },
    { href: "/reports", label: "Reports", icon: FileBarChart },
  ];

  const adminItems = [
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/logs", label: "Activity Logs", icon: FileText },
  ];

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href} className="block">
        <div className={cn(
          "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 group cursor-pointer",
          isActive
            ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}>
          <Icon className={cn("w-4 h-4 mr-3 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
          <TsedeyLogo />
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-6">
          <nav className="space-y-1">
            <div className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Operations</div>
            {navItems.map(item => <NavLink key={item.href} {...item} />)}
          </nav>

          {user?.role === "admin" && (
            <nav className="space-y-1">
              <div className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Administration</div>
              {adminItems.map(item => <NavLink key={item.href} {...item} />)}
            </nav>
          )}

          <nav className="space-y-1">
            <div className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Account</div>
            <NavLink href="/settings" label="API Keys" icon={Key} />
          </nav>
        </div>

        {/* Theme Toggle */}
        <div className="px-3 py-2 border-t border-sidebar-border">
          <ThemeToggle />
        </div>

        <div className="p-4 border-t border-sidebar-border bg-sidebar/50 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border shrink-0">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.username}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{user?.role}</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors text-xs"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 pl-64 flex flex-col min-w-0">
        <div className="flex-1 p-8">
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
