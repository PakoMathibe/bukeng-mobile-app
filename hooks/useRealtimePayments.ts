// hooks/useRealtimePayments.ts
import { useEffect, useState } from 'react'
import { RealtimeService } from '@/services/firebase/realtime'
import { useAuth } from './useAuth'

export function useRealtimePayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    const unsubscribe = RealtimeService.subscribeToPayments(user.id, (newPayments) => {
      setPayments(newPayments)
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [user])
  
  return { payments, loading }
}