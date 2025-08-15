'use client'

import { BudgetForm } from '@/components/BudgetForm'; // We will create this next
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function SetBudgetPage() {
    const router = useRouter();
    
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <div className="card">
                    <div className="card-header">
                        <h1 className="card-title">Create a New Budget</h1>
                        <p className="card-subtitle">Set a spending limit for one of your cards.</p>
                    </div>
                    <div className="p-6">
                        <BudgetForm />
                    </div>
                </div>
            </div>
        </div>
    )
}