import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldAlert, Lock, User as UserIcon, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

const registerSchema = z.object({
  username: z.string().min(3, "Min 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  email: z.string().email("Invalid email"),
  fullName: z.string().optional(),
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string().min(8, "Min 8 characters"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", fullName: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: RegisterFormValues) {
    setErrorMsg(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.username, email: data.email, fullName: data.fullName, password: data.password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.message || "Registration failed");
        return;
      }
      login(body.token, body.user);
      setLocation("/settings");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden dark">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 bg-card/60 backdrop-blur-xl border border-border shadow-2xl shadow-black/50 rounded-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 border border-primary/50 rounded-2xl animate-[ping_3s_ease-in-out_infinite]" />
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase text-center">
            Request Access
          </h1>
          <p className="text-sm text-primary font-mono tracking-[0.2em] mt-2 uppercase">
            New Operator Registration
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-2 text-center">
            New accounts are granted <span className="text-warning">Viewer</span> clearance by default.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 animate-pulse" />
                <p className="text-sm text-destructive-foreground font-mono">{errorMsg}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Callsign</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="username" className="pl-9 bg-background/50 font-mono" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-mono" />
                </FormItem>
              )} />
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" className="bg-background/50 font-mono" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs font-mono" />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="operator@org.com" className="pl-9 bg-background/50 font-mono" {...field} />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-mono" />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Access Code</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="Min 8 characters" className="pl-9 bg-background/50 font-mono" {...field} />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-mono" />
              </FormItem>
            )} />

            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider font-mono text-muted-foreground">Confirm Code</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="Repeat password" className="pl-9 bg-background/50 font-mono" {...field} />
                  </div>
                </FormControl>
                <FormMessage className="text-xs font-mono" />
              </FormItem>
            )} />

            <Button type="submit" className="w-full h-12 uppercase tracking-widest font-bold text-xs" disabled={isPending}>
              {isPending ? "Registering..." : "Request Clearance"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center border-t border-border/50 pt-4">
          <Link href="/login" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
