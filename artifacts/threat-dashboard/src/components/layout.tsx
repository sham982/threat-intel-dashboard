import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { useLogout } from "@workspace/api-client-react";
import { 
  ShieldAlert, 
  Activity, 
  Search, 
  List, 
  Bell, 
  BookOpen, 
  Users, 
  FileText, 
  LogOut,
  ChevronRight,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout: clearAuth } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        clearAuth();
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Activity },
    { href: "/lookup", label: "Indicator Lookup", icon: Search },
    { href: "/scans", label: "Scan History", icon: List },
    { href: "/alerts", label: "Active Alerts", icon: Bell },
    { href: "/resources", label: "SOC Resources", icon: BookOpen },
  ];

  const adminItems = [
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/logs", label: "Activity Logs", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <ShieldAlert className="w-6 h-6 text-primary mr-3" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-widest text-sidebar-foreground uppercase">Threat Intel</span>
            <span className="text-[10px] text-primary font-mono leading-none tracking-widest">COMMAND CENTER</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-6">
          <nav className="space-y-1">
            <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">Operations</div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 group cursor-pointer",
                    isActive 
                      ? "bg-sidebar-primary/10 text-sidebar-primary font-medium" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}>
                    <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
                    {item.label}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {user?.role === "admin" && (
            <nav className="space-y-1">
              <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">Administration</div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 group cursor-pointer",
                      isActive 
                        ? "bg-sidebar-primary/10 text-sidebar-primary font-medium" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}>
                      <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
                      {item.label}
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                    </div>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.username}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{user?.role}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
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
