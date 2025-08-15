// app/dashboard/budgets/[id]/page.tsx
'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'react-hot-toast';



export interface Budget {
    id: string;
    name: string;
    amount: number;
    spent_amount: number;
    remaining_amount: number; // This comes from your backend query
    currency: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    status: 'safe' | 'warning' | 'critical'; // This also comes from the backend
    // Joined card details
    card_number: string;
    card_type: string;
    card_holder_name: string;
}



const EditBudgetForm = ({ budget, onUpdate }: { budget: Budget, onUpdate: () => void }) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: budget.name,
        amount: budget.amount,
        endDate: new Date(budget.end_date).toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiService.updateBudget(budget.id, {
                ...formData,
                amount: parseFloat(String(formData.amount))
            });
            toast.success("Budget updated!");
            router.push('/dashboard');
            onUpdate(); // Refresh the page data
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Budget Name</Label>
                <Input name="name" value={formData.name} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="amount">Amount</Label>
                <Input name="amount" type="number" value={formData.amount} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
            </div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
        </form>
    );
};


export default function ManageBudgetPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [budget, setBudget] = useState<Budget | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBudget = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await apiService.getBudget(id);
            setBudget(res.data.budget);
        } catch (error) {
            toast.error("Could not load budget details.");
            router.push('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBudget();
    }, [id]);

    const handleArchive = async () => {
        if (!budget) return;
        if (!window.confirm("Are you sure you want to archive this budget? It will become inactive.")) return;

        try {
            await apiService.archiveBudget(budget.id); 
            toast.success("Budget archived.");
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to archive.");
        }
    }

    if (isLoading || !budget) {
        return <div>Loading budget...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-4">Manage Budget: {budget.name}</h1>
            
            <div className="card p-6 mb-8">
                <h3 className="card-title mb-4">Edit Details</h3>
                <EditBudgetForm budget={budget} onUpdate={fetchBudget} />
            </div>

            <div className="card p-6 border-red-500 border">
                 <h3 className="card-title text-red-600 mb-2">Danger Zone</h3>
                 <p className="text-sm text-gray-600 mb-4">Archiving this budget will make it inactive and you won't be able to log new transactions against it.</p>
                 <Button variant="danger" onClick={handleArchive}>Archive Budget</Button>
            </div>
        </div>
    );
}