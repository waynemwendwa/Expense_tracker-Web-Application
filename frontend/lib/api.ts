import axios from 'axios'

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
  },
  
  // Users
  users: {
    profile: '/users/profile',
    stats: '/users/stats',
    changePassword: '/users/change-password',
  },
  
  // Budgets
  budgets: {
    list: '/budgets',
    create: '/budgets',
    get: (id: string) => `/budgets/${id}`,
    update: (id: string) => `/budgets/${id}`,
    permanentDelete: (id: string) => `/budgets/${id}/permanent`, 
    archive: (id: string) => `/budgets/${id}/archive`, 
    cards: '/budgets/cards',
    addCard: '/budgets/cards',
  },
  


    //categories
  categories:{
    list: '/categories'
  },

  // Transactions
  transactions: {
    list: '/transactions',
    create: '/transactions',
    get: (id: string) => `/transactions/${id}`,
    update: (id: string) => `/transactions/${id}`,
    delete: (id: string) => `/transactions/${id}`,
  },
  
  // Receipts
  receipts: {
    list: '/receipts',
    upload: '/receipts/upload',
    get: (id: string) => `/receipts/${id}`,
    process: (id: string) => `/receipts/process/${id}`,
    delete: (id: string) => `/receipts/${id}`,
  },
  
  // Analytics
  analytics: {
    overview: '/analytics/overview',
    categories: '/analytics/categories',
    trends: '/analytics/trends',
    budgets: '/analytics/budgets',
    insights: '/analytics/insights',
  },
  
  // Notifications
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/mark-all-read',
    delete: (id: string) => `/notifications/${id}`,
  },


}

// API service functions
export const apiService = {
  // Auth
  login: (email: string, password: string) =>
    api.post(endpoints.auth.login, { email, password }),
  
  register: (userData: any) =>
    api.post(endpoints.auth.register, userData),
  
  getProfile: () =>
    api.get(endpoints.auth.profile),
  
  // Users
  updateProfile: (userData: any) =>
    api.put(endpoints.users.profile, userData),
  
  changePassword: (passwords: any) =>
    api.put(endpoints.users.changePassword, passwords),
  
  getUserStats: () =>
    api.get(endpoints.users.stats),

  //Categories
  getCategories:(params?: any)=>
    api.get(endpoints.categories.list, { params }),
  
  // Budgets
  getBudgets: (params?: any) =>
    api.get(endpoints.budgets.list, { params }),
  
  createBudget: (budgetData: any) =>
    api.post(endpoints.budgets.create, budgetData),
  
  getBudget: (id: string) =>
    api.get(endpoints.budgets.get(id)),
  
  updateBudget: (id: string, budgetData: any) =>
    api.put(endpoints.budgets.update(id), budgetData),
  
  archiveBudget: (id: string) => // <--- ADD THIS FUNCTION
    api.put(endpoints.budgets.archive(id)),

  deleteArchivedBudget: (id: string) =>
    api.delete(endpoints.budgets.permanentDelete(id)),
  
  getCards: () =>
    api.get(endpoints.budgets.cards),
  
  addCard: (cardData: any) =>
    api.post(endpoints.budgets.addCard, cardData),
  
  
  // Transactions
  getTransactions: (params: { limit?: number, page?: number, sortBy?: string, sortOrder?: string } = {}) =>{
    const queryParams = {
      limit: 20,
    page: 1,
    sortBy: 'transaction_date',
    sortOrder: 'desc',
    ...params, 
    };
    return api.get(endpoints.transactions.list, { params: queryParams });
  },
    
  
  createTransaction: (transactionData: any) =>
    api.post(endpoints.transactions.create, transactionData),
  
  getTransaction: (id: string) =>
    api.get(endpoints.transactions.get(id)),
  
  updateTransaction: (id: string, transactionData: any) =>
    api.put(endpoints.transactions.update(id), transactionData),
  
  deleteTransaction: (id: string) =>
    api.delete(endpoints.transactions.delete(id)),
  
  // Receipts
  getReceipts: (params?: any) =>
    api.get(endpoints.receipts.list, { params }),
  
  uploadReceipt: (formData: FormData) =>
    api.post(endpoints.receipts.upload, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  getReceipt: (id: string) =>
    api.get(endpoints.receipts.get(id)),
  
  processReceipt: (id: string, data: any) =>
    api.post(endpoints.receipts.process(id), data),
  
  deleteReceipt: (id: string) =>
    api.delete(endpoints.receipts.delete(id)),
  
  // Analytics
  getAnalyticsOverview: (params?: any) =>
    api.get(endpoints.analytics.overview, { params }),
  
  getAnalyticsCategories: (params?: any) =>
    api.get(endpoints.analytics.categories, { params }),
  
  getAnalyticsTrends: (params?: any) =>
    api.get(endpoints.analytics.trends, { params }),
  
  getAnalyticsBudgets: () =>
    api.get(endpoints.analytics.budgets),
  
  getAnalyticsInsights: (params?: any) =>
    api.get(endpoints.analytics.insights, { params }),
  
  // Notifications
  getNotifications: (params?: any) =>
    api.get(endpoints.notifications.list, { params }),
  
  getUnreadNotificationCount: () =>
    api.get(endpoints.notifications.unreadCount),
  
  markNotificationAsRead: (id: string) =>
    api.put(endpoints.notifications.markRead(id)),
  
  markAllNotificationsAsRead: () =>
    api.put(endpoints.notifications.markAllRead),
  
  deleteNotification: (id: string) =>
    api.delete(endpoints.notifications.delete(id)),
}
