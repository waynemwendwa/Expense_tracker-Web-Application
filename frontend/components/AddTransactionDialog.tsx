'use client'

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '@/lib/api'; // <--- IMPORT YOUR API SERVICE
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    Dialog, DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { PlusCircle } from 'lucide-react';



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


export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface AddTransactionDialogProps {
    onTransactionAdded: () => void;
}

export const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({ onTransactionAdded }) => {
    // Form State
    const [budgetId, setBudgetId] = useState<string>('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    // ... other form states

    // Data for dropdowns
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch data for dropdowns when dialog opens
    useEffect(() => {
        if (!isOpen) return;

        const fetchDataForDropdowns = async () => {
            try {
                const [budgetsRes, categoriesRes] = await Promise.all([
                    apiService.getBudgets({ isActive: true }), // Fetch only active budgets
                    apiService.getCategories(),
                ]);
                setBudgets(budgetsRes.data.budgets);
                setCategories(categoriesRes.data.categories);
            } catch (error) {
                toast.error("Could not load data for form.");
            }
        };

        fetchDataForDropdowns();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const toastId = toast.loading('Adding transaction...');

        const transactionData = {
            budgetId,
            categoryId,
            amount: parseFloat(amount),
            description,
            transactionDate,
        };

        try {
            // Use the apiService function directly
            await apiService.createTransaction(transactionData);

            toast.success('Transaction added!', { id: toastId });
            onTransactionAdded(); // Trigger refresh on dashboard
            setIsOpen(false);
            // ... reset form fields
            setBudgetId('');
            setCategoryId('');
            setAmount('');
            setDescription('');
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to add transaction.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* ... The rest of your JSX remains exactly the same ... */}
             <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add a New Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="budget">Budget</Label>
                        <Select onValueChange={setBudgetId} value={budgetId} required>
                            <SelectTrigger id="budget"><SelectValue placeholder="Select a budget" /></SelectTrigger>
                            <SelectContent className="bg-white">
                                {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={setCategoryId} value={categoryId} required>
                            <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                            <SelectContent className="bg-white">
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                    </div>
                     <div>
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" placeholder="e.g., Weekly groceries" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} required />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Transaction"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};