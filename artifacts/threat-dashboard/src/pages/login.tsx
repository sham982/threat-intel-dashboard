import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldAlert, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.message || err?.message || "Authentication failed");
      }
    }
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: LoginFormValues) {
    setErrorMsg(null);
    loginMutation.mutate({ data });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden dark">
      {/* Background ambient elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 md:p-10 bg-card/60 backdrop-blur-xl border border-border shadow-2xl shadow-black/50 rounded-lg">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary)_/_0.2)] relative">
            <div className="absolute inset-0 border border-primary/50 rounded-2xl animate-[ping_3s_ease-in-out_infinite]" />
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase text-center">
            Threat Intelligence
          </h1>
          <p className="text-sm text-primary font-mono tracking-[0.2em] mt-2 uppercase">
            Command Center
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 animate-pulse" />
                <p className="text-sm text-destructive-foreground font-mono">{errorMsg}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Operator ID</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input 
                        placeholder="Enter your username" 
                        className="pl-10 bg-background/50 border-border focus-visible:ring-primary focus-visible:border-primary font-mono" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-mono" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Access Code</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input 
                        type="password" 
                        placeholder="••••••••••••" 
                        className="pl-10 bg-background/50 border-border focus-visible:ring-primary focus-visible:border-primary font-mono" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-mono" />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 uppercase tracking-widest font-bold text-xs" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Authenticating..." : "Initialize Session"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center border-t border-border/50 pt-6 space-y-3">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            Restricted System. Authorized personnel only.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            New operator?{" "}
            <a href="/register" className="text-primary hover:underline underline-offset-4 transition-colors">
              Request clearance
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
