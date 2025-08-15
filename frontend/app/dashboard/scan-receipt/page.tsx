'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { useMutation, useQueryClient } from 'react-query'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { ArrowLeft, Upload, Camera, FileImage, Loader2 } from 'lucide-react'

interface ReceiptData {
  merchantName: string
  totalAmount: number
  transactionDate: string
  description: string
}

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

export default function ScanReceiptPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null)
  const [processing, setProcessing] = useState(false)

  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);


  //fetch data for the dropdowns when the extracted data is available
  useEffect(() => {
    if (extractedData) {
      const fetchDataForDropdowns = async () => {
        try {
          const [budgetsRes, categoriesRes] = await Promise.all([
            apiService.getBudgets({ isActive: true }), // Fetch only active budgets
            apiService.getCategories(),]);
          setBudgets(budgetsRes.data.budgets);
          setCategories(categoriesRes.data.categories);
        } catch (error) {
          toast.error("Could not load budgets or categories.");
        }
      };
      fetchDataForDropdowns();
    }
  }, [extractedData]);

  const router = useRouter()
  const queryClient = useQueryClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setExtractedData(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const uploadReceiptMutation = useMutation(
    (formData: FormData) => apiService.uploadReceipt(formData),
    {
      onSuccess: (response) => {
        const receipt = response.data.receipt
        setExtractedData({
          merchantName: receipt.merchant_name || '',
          totalAmount: receipt.total_amount || 0,
          transactionDate: receipt.transaction_date || new Date().toISOString().split('T')[0],
          description: receipt.merchant_name || 'Receipt transaction'
        })
        toast.success('Receipt processed successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to process receipt')
      },
    }
  )

  const processReceipt = async () => {
    if (!uploadedFile) return

    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('receipt', uploadedFile)

      await uploadReceiptMutation.mutateAsync(formData)
    } finally {
      setProcessing(false)
    }
  }

  const createTransactionMutation = useMutation(
    (data: any) => apiService.createTransaction(data),
    {
      onSuccess: () => {
        toast.success('Transaction created from receipt!')
        queryClient.invalidateQueries(['transactions'])
        router.push('/dashboard')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create transaction')
      },
    }
  )

  const handleCreateTransaction = async (formData: any) => {
    if (!extractedData || !selectedBudgetId || !selectedCategoryId) {
      toast.error('Please select a budget and category');
      return
    }

    try {
      await createTransactionMutation.mutateAsync({
        budgetId: selectedBudgetId,
        categoryId: selectedCategoryId,
        amount: extractedData.totalAmount,
        description: extractedData.description,
        transactionDate: extractedData.transactionDate
      })
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Scan Receipt</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Upload Section */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Upload Receipt</h2>
              <p className="card-subtitle">Take a photo or upload an image of your receipt</p>
            </div>

            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''} cursor-pointer`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-w-full h-64 object-contain mx-auto rounded-lg border"
                    />
                    <p className="text-sm text-gray-600">
                      {/* First, check if uploadedFile exists before trying to access its properties */}
                      {uploadedFile && (
                        <>
                          {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      {isDragActive ? (
                        <Upload className="w-8 h-8 text-primary-600" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {isDragActive ? 'Drop the file here' : 'Upload receipt image'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Drag and drop an image, or click to select
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {uploadedFile && !extractedData && (
              <div className="mt-4">
                <Button
                  onClick={processReceipt}
                  loading={processing}
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Receipt...
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4 mr-2" />
                      Process Receipt
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Extracted Data Section */}
          {extractedData && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Extracted Information</h2>
                <p className="card-subtitle">Review and edit the extracted data</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Merchant Name
                  </label>
                  <Input
                    value={extractedData.merchantName}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      merchantName: e.target.value
                    })}
                    placeholder="Merchant name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.totalAmount}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      totalAmount: parseFloat(e.target.value) || 0
                    })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Date
                  </label>
                  <Input
                    type="date"
                    value={extractedData.transactionDate}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      transactionDate: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Input
                    value={extractedData.description}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      description: e.target.value
                    })}
                    placeholder="Transaction description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
                  <Select onValueChange={setSelectedBudgetId} value={selectedBudgetId} required>
                    <SelectTrigger><SelectValue placeholder="Select a budget" /></SelectTrigger>
                    <SelectContent>
                      {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId} required>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFile(null)
                      setPreviewUrl(null)
                      setExtractedData(null)
                    }}
                    className="flex-1"
                  >
                    Scan Another
                  </Button>
                  <Button
                    onClick={handleCreateTransaction}
                    className="flex-1"
                    disabled={createTransactionMutation.isLoading}
                  >
                    {createTransactionMutation.isLoading ? 'Creating...' : 'Create Transaction'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
