'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input'; 
import { Label } from '@/components/ui/Label'; 




export interface Card {
  id: string;
  card_number: string; // This is the masked number
  card_type: 'visa' | 'mastercard' | 'amex' | 'discover';
  expiry_date: string;
  card_holder_name: string;
  is_active: boolean;
  created_at: string;
}

export const BudgetForm = () => {
    const { getAuthHeaders } = useAuth(); // Assuming your context provides a helper for auth headers
    const router = useRouter();

    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);

    // Fetch user's cards to populate the dropdown
    useEffect(() => {
        const fetchCards = async () => {
            try {
                const response = await fetch('/api/budgets/cards', { headers: getAuthHeaders() });
                if (!response.ok) throw new Error('Failed to fetch cards.');
                const data = await response.json();
                setCards(data.cards);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Could not load cards.');
            }
        };
        fetchCards();
    }, [getAuthHeaders]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (new Date(endDate) <= new Date(startDate)) {
            toast.error('End date must be after the start date.');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('Creating budget...');

        const budgetData = {
            cardId: selectedCardId,
            name,
            amount: parseFloat(amount),
            startDate,
            endDate,
        };

        try {
            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(budgetData),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create budget.');
            }
            toast.success('Budget created successfully!', { id: toastId });
            router.push('/dashboard'); // Redirect to dashboard to see the new budget
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <div>
                <Label htmlFor="card">Card</Label>
                <select
                    id="card"
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    required
                >
                    <option value="" disabled>-- Select a card --</option>
                    {cards.map((card) => (
                        <option key={card.id} value={card.id}>
                            {card.card_holder_name} - {card.card_type} ({card.card_number})
                        </option>
                    ))}
                </select>
             </div>

            <div>
                <Label htmlFor="name">Budget Name</Label>
                <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Monthly Budget" required />
            </div>

            <div>
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 500" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Budget'}
            </Button>
        </form>
    )
}