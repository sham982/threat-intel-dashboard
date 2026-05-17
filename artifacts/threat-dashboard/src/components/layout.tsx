import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { useLogout } from "@workspace/api-client-react";
import {
  Menu,
  X,
  LayoutDashboard,
  Search,
  History,
  AlertTriangle,
  BookOpen,
  FileBarChart,
  Users,
  FileText,
  Key,
  LogOut,
  ChevronRight,
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout: clearAuth } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => clearAuth(),
    });
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/lookup", label: "Threat Lookup", icon: Search },
    { href: "/scans", label: "Scan History", icon: History },
    { href: "/alerts", label: "Active Alerts", icon: AlertTriangle },
    { href: "/resources", label: "SOC Resources", icon: BookOpen },
      ];

  const adminItems = [
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/logs", label: "Activity Logs", icon: FileText },
  ];

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const isActive = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link href={href}>
        <div className={cn(
          "group relative flex items-center gap-3 rounded-md font-medium transition-all duration-200 cursor-pointer",
          !isCollapsed ? "px-3 py-2 justify-start" : "p-2.5 justify-center",
          isActive
            ? "bg-gradient-to-r from-[#8bc74c]/20 to-[#1bb7b6]/20 text-sidebar-primary border-l-2 border-[#8bc74c]"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/10"
        )}>
          <Icon className={cn(
            "transition-all duration-200 shrink-0",
            isCollapsed ? "w-6 h-6" : "w-4.5 h-4.5",
            isActive ? "text-[#8bc74c]" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80"
          )} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-sm font-medium">{label}</span>
              {isActive && <ChevronRight className="w-4 h-4 opacity-60 text-[#8bc74c]" />}
            </>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm flex flex-col fixed inset-y-0 left-0 z-50 shadow-xl transition-all duration-300",
        isCollapsed ? "w-24" : "w-72"
      )}>
        {/* Header with hamburger button */}
        <div className="relative h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#8bc74c] via-[#1bb7b6] to-[#c6cc3b]" />
          {/* Logo - hide text when collapsed */}
          <div className={cn("flex items-center", isCollapsed && "justify-center w-full")}>
            <img 
              src="/logo.png" 
              alt="Tsedey Bank" 
              className={cn("object-contain", isCollapsed ? "w-12 h-12" : "w-9 h-9")}
            />
            {!isCollapsed && (
              <div className="flex flex-col ml-3">
                <span className="font-bold text-sm tracking-widest text-sidebar-foreground uppercase leading-tight">
                  Tsedey Bank
                </span>
                <span className="text-[10px] text-primary font-mono tracking-widest">
                  THREAT INTELLIGENCE
                </span>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-sidebar-accent/20 transition-all duration-200 shrink-0"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation - compact spacing */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-6">
            {/* Main Navigation */}
            <div>
              {!isCollapsed && (
                <div className="px-3 mb-2 text-[11px] font-mono font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  CORE OPERATIONS
                </div>
              )}
              <nav className="space-y-1">
                {navItems.map(item => <NavLink key={item.href} {...item} />)}
              </nav>
            </div>

            {/* Admin Section */}
            {user?.role === "admin" && (
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-[11px] font-mono font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                    ADMINISTRATION
                  </div>
                )}
                <nav className="space-y-1">
                  {adminItems.map(item => <NavLink key={item.href} {...item} />)}
                </nav>
              </div>
            )}

            {/* Account Section */}
            <div>
              {!isCollapsed && (
                <div className="px-3 mb-2 text-[11px] font-mono font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  ACCOUNT
                </div>
              )}
              <nav className="space-y-1">
                <NavLink href="/settings" label="API Keys" icon={Key} />
              </nav>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar/30">
          <div className={cn(
            "flex items-center gap-3 mb-3",
            isCollapsed && "justify-center"
          )}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8bc74c]/20 to-[#1bb7b6]/20 flex items-center justify-center border border-[#8bc74c]/30 shrink-0">
              <Shield className="w-5 h-5 text-[#8bc74c]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">{user?.username}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8bc74c]">{user?.role}</span>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-sidebar-accent/20 transition-all duration-200 shrink-0"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>
          
          {/* Collapsed mode - theme toggle below */}
          {isCollapsed && (
            <div className="flex justify-center mb-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-sidebar-accent/20 transition-all duration-200"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          )}
          
          <Button
            variant="outline"
            className={cn(
              "w-full gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200 text-xs font-mono h-8",
              isCollapsed && "justify-center px-2"
            )}
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && (logoutMutation.isPending ? "Logging out..." : "Log Out")}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        isCollapsed ? "ml-24" : "ml-72"
      )}>
        <div className="flex-1 p-8">
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

