import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, User, ArrowRight, Shield } from "lucide-react";
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
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login-bgrd.png')" }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#8bc74c] via-[#1bb7b6] to-[#c6cc3b]" />
          
          <div className="p-8 md:p-8">
            
            {/* Logo & Title Section */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 mb-3 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8bc74c]/20 to-[#1bb7b6]/20 rounded-2xl blur-lg" />
                <img 
                  src="/logo.png" 
                  alt="Tsedey Bank" 
                  className="w-full h-full object-contain relative z-10"
                />
              </div>
              
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                Sign in to your account
              </p>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Error Message */}
                {errorMsg && (
                  <div className="p-2.5 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <p className="text-sm text-red-600 font-mono">{errorMsg}</p>
                  </div>
                )}

                {/* Username Field */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Username
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#8bc74c] transition-colors" />
                          </div>
                          <Input 
                            placeholder="Enter your username" 
                            className="pl-10 h-11 bg-gray-100 border-gray-200 focus:border-[#8bc74c] focus:ring-[#8bc74c]/20 font-mono transition-all duration-200 rounded-lg text-gray-800 placeholder:text-gray-400" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-mono text-red-500" />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#8bc74c] transition-colors" />
                          </div>
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10 h-11 bg-gray-100 border-gray-200 focus:border-[#8bc74c] focus:ring-[#8bc74c]/20 font-mono transition-all duration-200 rounded-lg text-gray-800 placeholder:text-gray-400" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-mono text-red-500" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-[#8bc74c] to-[#1bb7b6] hover:from-[#7ab33d] hover:to-[#159a99] text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] group mt-2"
                  disabled={loginMutation.isPending}
                >
                  <span className="flex items-center justify-center gap-2">
                    {loginMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </form>
            </Form>

            {/* Security Badge */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                <Shield className="w-3 h-3 text-[#8bc74c]" />
                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">
                  Secure Login • 256-bit SSL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
