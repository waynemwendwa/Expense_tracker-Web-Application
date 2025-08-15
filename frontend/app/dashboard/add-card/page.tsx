'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiService } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, CreditCard, Eye, EyeOff } from 'lucide-react'
import { getCardType, maskCreditCard, isValidCreditCard } from '@/lib/utils'

interface CardFormData {
  cardNumber: string
  cardType: string
  expiryDate: string
  cvv: string
  cardHolderName: string
}

export default function AddCardPage() {
  const [showCvv, setShowCvv] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CardFormData>()

  const cardNumber = watch('cardNumber')

  // Auto-detect card type
  const detectedCardType = cardNumber ? getCardType(cardNumber) : ''

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const match = cleaned.match(/\d{4,16}/g)
    const match2 = match ? match.join(' ') : ''
    return match2
  }

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const addCardMutation = useMutation(
    (cardData: CardFormData) => apiService.addCard(cardData),
    {
      onSuccess: () => {
        toast.success('Card added successfully!')
        queryClient.invalidateQueries(['cards'])
        router.push('/dashboard')
      },
      
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to add card')
      },
    }
  )

  const onSubmit = async (data: CardFormData) => {
    if (!isValidCreditCard(data.cardNumber)) {
      toast.error('Invalid card number')
      return
    }

    setLoading(true)
    try {
      await addCardMutation.mutateAsync(data)
    } finally {
      setLoading(false)
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
            <h1 className="text-xl font-semibold text-gray-900">Add Payment Card</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Card Information</h2>
              <p className="card-subtitle">Add a new payment card to your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Card Number */}
              <div>
                <div className="relative">
                  {/* Card Number */}
                  <div>
                    <label
                      htmlFor="cardNumber"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Card Number
                    </label>

                    <div className="relative">
                      <Controller
                        name="cardNumber"
                        control={control}
                        rules={{
                          required: 'Card number is required',
                          validate: (value) =>
                            isValidCreditCard(value) || 'Invalid card number',
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="cardNumber"
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}

                            // onChange={(e) => {
                            //   const formatted = formatCardNumber(e.target.value)
                            //   field.onChange(formatted) // Update RHF's state
                            // }}
                            error={errors.cardNumber?.message}
                          />
                        )}
                      />
                    </div>

                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {detectedCardType && (
                    <p className="mt-1 text-sm text-gray-600">
                      Detected:{' '}
                      {detectedCardType.charAt(0).toUpperCase() +
                        detectedCardType.slice(1)}
                    </p>
                  )}
                </div>

              </div>

              {/* Card Type */}
              <div>
                <label htmlFor="cardType" className="block text-sm font-medium text-gray-700 mb-2">
                  Card Type
                </label>
                <select
                  id="cardType"
                  className="input"
                  {...register('cardType', { required: 'Card type is required' })}
                  value={detectedCardType || ''}
                  onChange={(e) => setValue('cardType', e.target.value)}
                >
                  <option value="">Select card type</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">American Express</option>
                  <option value="discover">Discover</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expiry Date */}
                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <Input
                    id="expiryDate"
                    type="text"
                    placeholder="MM/YY"
                    maxLength={5}
                    {...register('expiryDate', {
                      required: 'Expiry date is required',
                      pattern: {
                        value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
                        message: 'Invalid expiry date format (MM/YY)',
                      },
                    })}
                    onChange={(e) => {
                      const formatted = formatExpiryDate(e.target.value)
                      e.target.value = formatted
                      setValue('expiryDate', formatted)
                    }}
                    error={errors.expiryDate?.message}
                  />
                </div>

                {/* CVV */}
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <div className="relative">
                    <Input
                      id="cvv"
                      type={showCvv ? 'text' : 'password'}
                      placeholder="123"
                      maxLength={4}
                      {...register('cvv', {
                        required: 'CVV is required',
                        pattern: {
                          value: /^[0-9]{3,4}$/,
                          message: 'CVV must be 3-4 digits',
                        },
                      })}
                      error={errors.cvv?.message}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCvv(!showCvv)}
                    >
                      {showCvv ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Holder Name */}
              <div>
                <label htmlFor="cardHolderName" className="block text-sm font-medium text-gray-700 mb-2">
                  Card Holder Name
                </label>
                <Input
                  id="cardHolderName"
                  type="text"
                  placeholder="John Doe"
                  {...register('cardHolderName', {
                    required: 'Card holder name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  error={errors.cardHolderName?.message}
                />
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  loading={loading}
                  disabled={loading}
                 
                >
                  Add Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
