import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Lookup from "@/pages/lookup";
import Scans from "@/pages/scans";
import Alerts from "@/pages/alerts";
import Resources from "@/pages/resources";
import Users from "@/pages/users";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

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
      <Route path="/reports">
        {() => <ProtectedRoute component={() => <Layout><Reports /></Layout>} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={() => <Layout><Settings /></Layout>} />}
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
