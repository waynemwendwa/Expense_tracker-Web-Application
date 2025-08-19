// app/verify-email/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin } = useAuth(); // Rename to avoid conflict

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const email = searchParams.get('email');

  // Redirect if no email is in the URL
  useEffect(() => {
    if (!email) {
      toast.error("No email provided. Redirecting to register.");
      router.replace('/register');
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiService.verifyEmail({ email, code });
      const { token, user } = response.data;
      authLogin(token, user); // Log the user in and redirect to dashboard
      toast.success("Account verified successfully! Welcome!");
      router.push('/login'); // Redirect to the login page
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Verification failed.");
    } finally {
      setIsLoading(false);
      router.replace('/'); // Clear the URL to prevent resubmission
      setCode(''); // Clear the code input
      router.refresh(); // Refresh the page to ensure state is reset
      router.push('/'); // Redirect to home after verification
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await apiService.resendVerificationCode({ email });
      toast.success("A new verification code has been sent.");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };
  
  if (!email) {
    // Render nothing while redirecting
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <MailCheck className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          Verify Your Email
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We've sent a 6-digit verification code to <strong className="font-medium text-gray-800">{email}</strong>. Please enter it below.
        </p>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
          >
            <InputOTPGroup className="mx-auto">
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Account
          </Button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Didn't receive the email?{' '}
            <button
              onClick={handleResendCode}
              disabled={isResending}
              className="font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Click to resend'}
            </button>
          </p>
          <p className="mt-2">
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Use a different email address
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}