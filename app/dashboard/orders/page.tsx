// app/(dashboard)/orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { PaymentService } from '@/domains/payments/paymentService';
import {
  Package,
  Clock,
  CheckCircle,
  ShoppingBag,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function OrdersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userOrders = await PaymentService.getUserOrders(user.id);
      setOrders(userOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
            Completed
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
            Pending
          </span>
        );
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleMakePayment = async (orderId: string) => {
    setProcessingOrder(orderId);
    try {
      // Navigate to checkout or process payment
      router.push(`/dashboard/checkout?orderId=${orderId}`);
    } catch (error) {
      toast.error('Failed to initiate payment');
    } finally {
      setProcessingOrder(null);
    }
  };

  const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
  const activeOrders = orders.filter((o) => o.status === 'active').length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="text-sm text-gray-500">
          Total spent:{' '}
          <span className="font-semibold text-gray-900">R{totalSpent.toLocaleString()}</span>
        </div>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <Package className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{activeOrders}</p>
          <p className="text-sm text-gray-600">Active Orders</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
          <p className="text-sm text-gray-600">Completed Orders</p>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400">
            Visit a partner store to make your first purchase
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleExpand(order.id)}
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {order.merchantName}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Order #{order.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">R{order.amount}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(order.createdAt), 'dd MMM yyyy')}
                  </p>
                </div>
                {expandedOrder === order.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Order Details (Expanded) */}
              {expandedOrder === order.id && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <div className="space-y-4">
                    {/* Order Summary */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Order Amount</p>
                        <p className="font-semibold text-gray-900">
                          R{order.amount}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Service Fee (0.8%)</p>
                        <p className="font-semibold text-gray-900">
                          R{order.serviceFee}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Amount</p>
                        <p className="font-semibold text-teal-600">
                          R{order.totalAmount}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Instalments</p>
                        <p className="font-semibold text-gray-900">
                          3 payments
                        </p>
                      </div>
                    </div>

                    {/* Instalment Schedule */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Repayment Schedule
                      </p>
                      <div className="space-y-2">
                        {order.instalments.map((instalment, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-3 bg-white rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  instalment.paid
                                    ? 'bg-green-500'
                                    : 'bg-gray-300'
                                }`}
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Instalment {instalment.number} of 3
                                </p>
                                <p className="text-xs text-gray-500">
                                  {instalment.paid
                                    ? `Paid on ${instalment.date}`
                                    : `Due by ${instalment.dueDate}`}
                                </p>
                              </div>
                            </div>
                            <p
                              className={`font-semibold ${
                                instalment.paid
                                  ? 'text-green-600'
                                  : 'text-gray-900'
                              }`}
                            >
                              R{instalment.amount}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    {order.status === 'active' && (
                      <button
                        onClick={() => handleMakePayment(order.id)}
                        disabled={processingOrder === order.id}
                        className="w-full py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processingOrder === order.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          'Make a Payment'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}