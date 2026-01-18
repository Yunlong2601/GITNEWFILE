import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary text-primary-foreground rounded-xl shadow-lg">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">FortiFile</h1>
          </div>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Next-generation secure file management. Multi-level encryption, 
            DLP protection, and secure collaborative chat.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              "End-to-End Encryption",
              "DLP Scanning",
              "Secure Chat",
              "Role-based Access"
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl border-none">
          <CardHeader>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <AuthForm type="login" onSubmit={(data) => loginMutation.mutate(data)} isLoading={loginMutation.isPending} />
              </TabsContent>
              <TabsContent value="register">
                <AuthForm type="register" onSubmit={(data) => registerMutation.mutate(data)} isLoading={registerMutation.isPending} />
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function AuthForm({ type, onSubmit, isLoading }: { type: 'login' | 'register', onSubmit: (data: any) => void, isLoading: boolean }) {
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? "Please wait..." : type === 'login' ? "Login" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}