import  { signInSchema } from "@/lib/schema";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter, } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router";
import { useLoginMutation } from "@/hooks/use-auth"
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useAuth } from "@/provider/auth-context";


type SignInFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const {login} = useAuth();
  const form = useForm<z.infer<typeof signInSchema>>({
   resolver: zodResolver(signInSchema),
   defaultValues: {
    email: "",
    password: "",
   }, 
  });

  const { mutate } = useLoginMutation();
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  const handleOnSubmit = (values: SignInFormData) => {
    setIsLoading(true);
    mutate(values, {
      onSuccess: (data) => {
        login(data);
        console.log(data);
        toast.success("Login successful");
        navigate("/dashboard");
        setIsLoading(false);
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.message || "An error occurred";
        console.log(error);
        toast.error(errorMessage);
        setIsLoading(false);
      },
    });
  };
  return <div
  className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4"
  >
    <Card className="max-w-md w-full shadow-xl">
      <CardHeader className="text-center">
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-0.5">
                    <FormLabel>Password</FormLabel>
                    <Link to="/forgot-password" className="text-sm text-blue-500">
                      Forgot Password?
                    </Link>
                  </div>
                  <FormLabel></FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <button
              type="submit"
              className="w-full bg-black -500 text-white py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? <Loader className="w-5 h-5 mx-auto animate-spin" /> : "Sign In"}
            </button>
          </form>
        </Form>

        <CardFooter>
          <div className="flex items-center justify-center md:justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a href="/sign-up" className="text-blue-500 hover:underline">
                Sign Up
              </a>
            </p>
          </div>
        </CardFooter>
      </CardContent>
    </Card>
    </div>

};

export default SignIn;


