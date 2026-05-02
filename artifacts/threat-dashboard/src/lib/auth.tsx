import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// Initialize auth token getter
setAuthTokenGetter(() => localStorage.getItem("auth_token"));

type AuthContextType = {
  user: User | null | undefined;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(localStorage.getItem("auth_token"));

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      // If session is invalid, clear token
      localStorage.removeItem("auth_token");
      setTokenState(null);
      queryClient.setQueryData([`/api/auth/me`], null);
    }
  }, [error, queryClient]);

  const login = (newToken: string, user: User) => {
    localStorage.setItem("auth_token", newToken);
    setTokenState(newToken);
    queryClient.setQueryData([`/api/auth/me`], user);
    setLocation("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setTokenState(null);
    queryClient.setQueryData([`/api/auth/me`], null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: !!token && isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation, adminOnly]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse font-mono text-sm tracking-widest uppercase">INITIALIZING COCKPIT...</p>
        </div>
      </div>
    );
  }

  if (!user || (adminOnly && user.role !== "admin")) {
    return null;
  }

  return <Component {...rest} />;
}
