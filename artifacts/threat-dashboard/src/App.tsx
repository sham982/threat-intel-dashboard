import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Lookup from "@/pages/lookup";
import Scans from "@/pages/scans";
import Alerts from "@/pages/alerts";
import Resources from "@/pages/resources";
import Users from "@/pages/users";
import Logs from "@/pages/logs";

const queryClient = new QueryClient();

// Placeholder components for pages we haven't built yet
function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center border border-dashed border-border rounded-lg bg-card/30">
      <h2 className="text-xl font-bold tracking-tight uppercase text-muted-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground font-mono">Module under construction</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard">
        {() => <ProtectedRoute component={() => <Layout><Dashboard /></Layout>} />}
      </Route>
      <Route path="/lookup">
        {() => <ProtectedRoute component={() => <Layout><Lookup /></Layout>} />}
      </Route>
      <Route path="/scans">
        {() => <ProtectedRoute component={() => <Layout><Scans /></Layout>} />}
      </Route>
      <Route path="/alerts">
        {() => <ProtectedRoute component={() => <Layout><Alerts /></Layout>} />}
      </Route>
      <Route path="/resources">
        {() => <ProtectedRoute component={() => <Layout><Resources /></Layout>} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute adminOnly component={() => <Layout><Users /></Layout>} />}
      </Route>
      <Route path="/admin/logs">
        {() => <ProtectedRoute adminOnly component={() => <Layout><Logs /></Layout>} />}
      </Route>
      
      <Route path="/">
        {() => <ProtectedRoute component={() => <Layout><Dashboard /></Layout>} />}
      </Route>
      
      <Route>
        {() => <ProtectedRoute component={() => <Layout><NotFound /></Layout>} />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
