'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { TrendingUp, LogOut, User, CreditCard, Receipt, BarChart3, Banknote, Settings, Trash2Icon } from 'lucide-react'
import ProgressBar from '@/components/ui/ProgressBar'

import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { TransactionList } from '@/components/TransactionList';
import { UserNav } from '@/components/UserNav'
import { formatCurrency } from '@/lib/utils'
import { NotificationsPopover } from '@/components/NotificationsPopover'
import Link from 'next/link'


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

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

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

export interface UserStats {
  budgets: { total: number; active: number };
  transactions: { total: number; totalSpent: number };
  receipts: { total: number };
  notifications: { unread: number };
}


const BudgetOverview = ({budgets,isLoading,onAction}:{budgets: Budget[],isLoading: boolean,onAction: ()=> void,})=>{
  if (isLoading) {
    return <div className='text-center py-8 text-gray-500'>Loading Budgets...</div>;
}
if (budgets.length === 0) {
  return(
    <div className='text-center py-8'>
      <CreditCard className='w-12 h-12 text-gray-400 mx-auto mb-4'/>
      <p className='text-gray-500'>No budgets set</p>
      <p className='text-sm text-gray-400'>Create a budget to start tracking your spending</p>
    </div>
  );
}
const handlePermanentDelete = async (budgetId: string) => {
  if (!window.confirm("Are you sure you want to PERMANENTLY delete this budget and all its associated transactions? This ACTION cannot be undone.")) {
    return;    
  }
  try {
    await apiService.deleteArchivedBudget(budgetId);
    toast.success("Budget permanently deleted.");
    onAction(); // Refresh budgets after deletion
  } catch (error: any) {
    toast.error(error.response?.data?.error || "Failed to delete budget.");
  }
}
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US',{ style: 'currency', currency }).format(amount);
}


return(
  <div className='space-y-4'>{budgets.map((budget) => (
    <div key={budget.id} className={`p-4 border rounded-lg ${!budget.is_active ? 'bg-gray-100 opacity-60' : ''}`}>
      <div className='flex justify-between items-center mb-2'>
        <div>
          <h4 className='font-semibold text-gray-800'>
            {budget.name}
             {!budget.is_active && <span className="ml-2 text-xs font-normal text-gray-500">(Archived)</span>} 
          </h4>
          <span className='text-xs font-medium text-gray-500'>{budget.card_number}</span>
        </div>
        {budget.is_active && (
        <Link href={`/dashboard/budgets/${budget.id}`} passHref>
        <Button variant="outline" size='sm' className='text-xs'>
          <Settings className='w-4 h-4'/>
          <span className='sr-only'>Manage Budget</span>
          </Button>
        </Link>
        )}

      </div>
      <ProgressBar spent={budget.spent_amount} total={budget.amount}/>
      <div className='flex justify-between items-center mt-2 text-sm'>
        <span className='text-gray-600'>
          {formatCurrency(budget.spent_amount,budget.currency)}{' '}
          spent
        </span>
        {!budget.is_active ? (
        <Button
        variant='outline'
        size='md'
        className='text-red-600 hover:text-red-800 h-auto p-2'
        onClick={() => handlePermanentDelete(budget.id)}
        >
            <Trash2Icon className='w-6 h-6' />
        </Button>
        ):(
        <span className='font-semibold text-gray-800'>
          {formatCurrency(budget.remaining_amount,budget.currency)}{' '}
          left
        </span>
        )}
      </div>
    </div>
  ))}
  </div>
);
};

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [budgets, setBudgets] = useState<Budget[]>([]);
  

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [stats, setStats] = useState<UserStats | null>(null);

    // Use useCallback to memoize the fetch function
  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    // We are NOT using Promise.all for debugging, so we can see which call fails.
     try {
      // Promise.all is great here. We fetch everything concurrently.
      const [statsRes, budgetsRes, transactionsRes] = await Promise.all([
        apiService.getUserStats(), // <-- Use the efficient stats endpoint!
        apiService.getBudgets(),
        apiService.getTransactions({ limit: 5, page: 1 })
      ]);

      setStats(statsRes.data.stats); // Set the stats state
      setBudgets(budgetsRes.data.budgets);
      setTransactions(transactionsRes.data.transactions);

    } catch (error: any) {
      console.error("Dashboard fetch error:", error.response || error);
      toast.error("Failed to load dashboard data.");
    } finally {
      setIsDataLoading(false);
    }
}, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  

  if (!authLoading && user) {
        fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalTransactions = pagination?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ExpenseTracker</span>
              <AddTransactionDialog onTransactionAdded={fetchData} />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                
                {/* <span>Welcome, {user.firstName}!</span> */}
                <NotificationsPopover />
                <UserNav/>
                  
              </div>
              {/* <Button
                variant="ghost"
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome to your expense tracking dashboard. Here's an overview of your financial health.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Budgets</p>
                <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '...' : stats?.budgets.active ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '...' : stats?.transactions.total ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '...' : formatCurrency(stats?.transactions.totalSpent ?? 0, 'USD')}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '...' : stats?.notifications.unread ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
              <p className="card-subtitle">Manage your finances</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/add-card')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Add Payment Card
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/dashboard/scan-receipt')}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Scan Receipt
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/dashboard/analytics')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
               <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push('/dashboard/budgets')}
              >
                <Banknote className="w-4 h-4 mr-2" />
                Set Budgets
              </Button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Your latest transactions</p>
            </div>
            {/* <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">Start by adding a transaction or scanning a receipt</p>
            </div> */}
             <div className="p-4 md:p-6">
              <TransactionList 
                transactions={transactions} 
                isLoading={isDataLoading}
                onTransactionAction={fetchData} // Pass the single refresh function
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Budget Overview</h3>
              <p className="card-subtitle">Your spending limits</p>
              
            </div>
            <div className="text-center py-8">
              <BudgetOverview budgets={budgets} isLoading={isDataLoading} onAction={fetchData}/>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Getting Started</h3>
              <p className="card-subtitle">Follow these steps to set up your expense tracking</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Add Payment Card</h4>
                <p className="text-sm text-gray-600">
                  Link your credit or debit cards to start tracking expenses
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Set Budget Limits</h4>
                <p className="text-sm text-gray-600">
                  Create budgets for different spending categories
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Track Expenses</h4>
                <p className="text-sm text-gray-600">
                  Add transactions manually or scan receipts automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
