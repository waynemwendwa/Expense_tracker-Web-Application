'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, TrendingUp, PieChart, BarChart3, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { AxiosResponse } from 'axios'; 
import { useAuth } from '@/contexts/AuthContext'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)


export interface AnalyticsOverview {
  period: {
    start: string;
    end: string;
    name: string;
  };
  spending: {
    total: number;
    count: number;
    average: number;
  };
  budget: {
    total: number;
    spent: number;
    remaining: number;
    percentage: number;
    activeCount: number;
  };
}

export interface AnalyticsCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalSpent: number;
  transactionCount: number;
  averageAmount: number;
}

export interface AnalyticsTrend {
  date: string;
  totalSpent: number;
  transactionCount: number;
}

export interface AnalyticsInsight {
  period: {
    start: string;
    end: string;
    name: string;
  };
  topCategories: Array<{
    name: string;
    icon: string;
    color: string;
    totalSpent: number;
  }>;
  largestTransactions: Array<{
    amount: number;
    description: string;
    transactionDate: string;
    categoryName: string;
    icon: string;
  }>;
  patterns: Array<{
    dayOfWeek: number;
    hourOfDay: number;
    transactionCount: number;
    totalSpent: number;
  }>;
  budgetAlerts: Array<{
    name: string;
    amount: number;
    spentAmount: number;
    currency: string;
    percentageUsed: number;
  }>;
}

export default function AnalyticsPage() {
  const { user } = useAuth() // Assuming useAuth is a custom hook to get user context
  const [period, setPeriod] = useState('month')
  const router = useRouter()

  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>(
    ['analytics-overview', period],
    () => apiService.getAnalyticsOverview({ period }).then(res => res.data.overview),
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      
     } 
  )

  const { data: categories, isLoading: categoriesLoading } = useQuery<AnalyticsCategory[]>(
    ['analytics-categories', period],
    () => apiService.getAnalyticsCategories({ period }).then(res => res.data.categories),
    { 
      staleTime: 5 * 60 * 1000,
      
    }
  )

  const { data: trends, isLoading: trendsLoading } = useQuery<AnalyticsTrend[]>(
    ['analytics-trends', period],
    () => apiService.getAnalyticsTrends({ period, groupBy: 'day' }).then(res => res.data.trends),
    { 
      staleTime: 5 * 60 * 1000,
      
    }
  )

  const { data: insights, isLoading: insightsLoading } = useQuery<AnalyticsInsight>(
    ['analytics-insights', period],
    () => apiService.getAnalyticsInsights({ period }).then(res => res.data.insights),
    {
      staleTime: 5 * 60 * 1000, 
      
    }
  )
  // Prepare chart data
  const categoryChartData = {
    labels: (categories || []).map((cat: AnalyticsCategory) => cat.name),
    datasets: [
      {
        data: (categories || []).map((cat: AnalyticsCategory) => cat.totalSpent),
        backgroundColor: (categories || []).map((cat: AnalyticsCategory) => cat.color),
        borderWidth: 0,
      },
    ],
  }

  const trendsChartData = {
    labels: (trends || []).map((trend: AnalyticsTrend) => trend.date),
    datasets: [
      {
        label: 'Daily Spending',
        data: (trends || []).map((trend: AnalyticsTrend) => trend.totalSpent),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  }

  const trendsChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value, user?.preferredCurrency)
          }
        }
      }
    }
  }

  if (overviewLoading || categoriesLoading || trendsLoading || insightsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            </div>
            
            {/* Period Selector */}
            <div className="flex space-x-2">
              {['week', 'month', 'quarter', 'year'].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(overview.spending.total, user?.preferredCurrency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overview.spending.count}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(overview.spending.average, user?.preferredCurrency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-danger-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Budget Used</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overview.budget.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Spending Trends */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Spending Trends</h3>
              <p className="card-subtitle">Daily spending over time</p>
            </div>
            <div className="chart-container">
              <Bar data={trendsChartData} options={trendsChartOptions} />
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Category Breakdown</h3>
              <p className="card-subtitle">Spending by category</p>
            </div>
            <div className="chart-container">
              <Doughnut data={categoryChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Categories */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Top Spending Categories</h3>
                <p className="card-subtitle">Your highest expense categories</p>
              </div>
              <div className="space-y-4">
                {insights.topCategories?.slice(0, 5).map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{category.icon}</span>
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(category.totalSpent, user?.preferredCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Largest Transactions */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Largest Transactions</h3>
                <p className="card-subtitle">Your biggest expenses</p>
              </div>
              <div className="space-y-4">
                {insights.largestTransactions?.slice(0, 5).map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{transaction.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-600">{transaction.categoryName}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(transaction.amount, user?.preferredCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Budget Alerts */}
        {insights?.budgetAlerts && insights.budgetAlerts.length > 0 && (
          <div className="card mt-8">
            <div className="card-header">
              <h3 className="card-title">Budget Alerts</h3>
              <p className="card-subtitle">Budgets approaching their limits</p>
            </div>
            <div className="space-y-4">
              {insights.budgetAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-warning-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{alert.name}</p>
                    <p className="text-sm text-gray-600">
                      {alert.percentageUsed.toFixed(1)}% of budget used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(alert.spentAmount, user?.preferredCurrency)} / {formatCurrency(alert.amount, user?.preferredCurrency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(alert.amount - alert.spentAmount, user?.preferredCurrency)} remaining
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
