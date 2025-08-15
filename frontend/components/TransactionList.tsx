'use client'

import React from 'react';
import { apiService } from '@/lib/api'; // <--- IMPORT YOUR API SERVICE
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit, Receipt } from 'lucide-react';


export interface Transaction {
  id:string;
  amount: number;
  description: string;
  transaction_date: string;
  location?: string;
  tags?: string[];
  created_at: string;
  // Joined data from the backend
  category_name: string;
  category_icon: string;
  category_color: string;
  budget_name: string;
  currency: string;
}


interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onTransactionAction: () => void; // A more generic name for refresh
}


// Helper to format currency
const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, isLoading, onTransactionAction }) => {
  // We no longer need useAuth here at all!
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading transactions...</div>;
}
 if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No transactions yet</p>
        <p className="text-sm text-gray-400">Add a transaction to see it here.</p>
      </div>
    );
  }

  const handleDelete = async (transactionId: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }
    const toastId = toast.loading('Deleting transaction...');
    try {
      // Use the apiService function directly
      await apiService.deleteTransaction(transactionId);
      toast.success('Transaction deleted!', { id: toastId });
      onTransactionAction(); // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete transaction.", { id: toastId });
    }
  }
  
  // ... The rest of your JSX remains exactly the same ...
  // Make sure to update the delete button's onClick:
  // onClick={() => handleDelete(t.id)}
  return (
    <ul className="space-y-3">
      {transactions.map(t => (
        <li key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
          <div className="flex items-center space-x-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white" 
              style={{ backgroundColor: t.category_color || '#cccccc' }}
            >
              {/* You can map t.category_icon to actual Lucide icons later if you want */}
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex-grow">
              <p className="font-semibold text-gray-800">{t.description}</p>
              <p className="text-sm text-gray-500">
                {t.category_name} &bull; {new Date(t.transaction_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <p className="font-bold text-gray-900 text-right">{formatCurrency(t.amount, t.currency)}</p>
            <Button variant="ghost" size="md" className="h-8 w-8 text-gray-500" onClick={() => {/* TODO: Open edit modal */}}>
                <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="md" className="h-8 w-8 text-danger-500 hover:text-danger-600" onClick={() => handleDelete(t.id)}>
                <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
};