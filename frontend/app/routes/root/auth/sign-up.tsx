import  { signInSchema, signUpSchema } from "@/lib/schema";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter, } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSignUpMutation } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export type SignupFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const navigate = useNavigate();
  const form = useForm<SignupFormData>({
   resolver: zodResolver(signUpSchema),
   defaultValues: {
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
   }, 
  });

  const { mutate, isPending } = useSignUpMutation();

  const handleonSubmit = (values: SignupFormData) => {
    mutate(values, {
      onSuccess: (data) => {
        toast.success("Email Verification Required!", {
          description: "Please check your email for a verification link. If you don't see it, check your spam folder.", 
        });
        form.reset();
        navigate("/sign-in");
      },

      onError: (error: any) => {
        const errorMessage =
        error.response?.data?.message || "An error occurred";
        console.log(error);
        toast.error(errorMessage);
      },
    });
  }

  return <div
  className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4"
  >
    <Card className="max-w-md w-full shadow-xl">
      <CardHeader className="text-center">
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Sign up to create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleonSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Enter your name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm your password" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <button
              type="submit"
              className="w-full bg-black -500 text-white py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled ={isPending}
            >
              {isPending ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </Form>

        <CardFooter>
          <div className="flex items-center justify-center md:justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/sign-in" className="text-blue-500 hover:underline">
                Sign In
              </a>
            </p>
          </div>
        </CardFooter>
      </CardContent>
    </Card>
    </div>

};

export default SignUp;

function mutate(values: { email: string; password: string; name: string; confirmPassword: string; }, arg1: { onSuccess: (data: any) => void; onError: (error: any) => void; }) {
  throw new Error("Function not implemented.");
}
