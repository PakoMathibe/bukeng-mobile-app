// app/(dashboard)/checkout/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, CreditCard, QrCode, CheckCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  const [step, setStep] = useState<'scan' | 'confirm' | 'processing' | 'success'>('scan')
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  
  const handleScanQR = () => {
    if (!merchant || !amount) {
      toast.error('Please enter merchant name and amount')
      return
    }
    setStep('confirm')
  }
  
  const handleConfirmPayment = async () => {
    setStep('processing')
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setStep('success')
    
    // Redirect after 2 seconds
    setTimeout(() => {
      router.push('/dashboard/orders')
    }, 2000)
  }
  
  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your order has been processed. You'll receive a confirmation shortly.
          </p>
          <div className="animate-pulse text-teal-600">
            Redirecting to orders...
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'scan' ? (
              <QrCode className="w-8 h-8 text-teal-600" />
            ) : (
              <CreditCard className="w-8 h-8 text-teal-600" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'scan' ? 'Scan QR Code' : 'Confirm Payment'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {step === 'scan' 
              ? 'Scan the QR code at the merchant checkout' 
              : 'Review your order before confirming'}
          </p>
        </div>
        
        {step === 'scan' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Name
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="input-field"
                placeholder="e.g., SPAR Killarney"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (R)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Payment Summary:</p>
              <div className="flex justify-between text-sm">
                <span>Purchase Amount:</span>
                <span className="font-medium">R{amount || '0'}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Service Fee (0.8%):</span>
                <span className="font-medium">R{(parseFloat(amount) * 0.008).to