// app/(dashboard)/orders/page.tsx
'use client';

import { useState } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  ShoppingBag,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';

// Mock orders data
const mockOrders = [
  {
    id: 'BKN-001',
    merchantName: 'SPAR Killarney',
    amount: 450,
    serviceFee: 3.6,
    totalAmount: 453.6,
    status: 'active',
    date: '2024-01-15',
    instalments: [
      { number: 1, amount: 151.2, paid: true, date: '2024-01-15' },
      { number: 2, amount: 151.2, paid: false, dueDate: '2024-02-15' },
      { number: 3, amount: 151.2, paid: false, dueDate: '2024-03-15' },
    ],
  },
  {
    id: 'BKN-002',
    merchantName: 'Checkers Rosebank',
    amount: 320,
    serviceFee: 2.56,
    totalAmount: 322.56,
    status: 'active',
    date: '2024-01-05',
    instalments: [
      { number: 1, amount: 107.52, paid: true, date: '2024-01-05' },
      { number: 2, amount: 107.52, paid: true, date: '2024-02-05' },
      { number: 3, amount: 107.52, paid: false, dueDate: '2024-03-05' },
    ],
  },
  {
    id: 'BKN-003',
    merchantName: 'Pick n Pay Sandton',
    amount: 280,
    serviceFee: 2.24,
    totalAmount: 282.24,
    status: 'completed',
    date: '2023-12-10',
    instalments: [
      { number: 1, amount: 94.08, paid: true, date: '2023-12-10' },
      { number: 2, amount: 94.08, paid: true, date: '2024-01-10' },
      { number: 3, amount: 94.08, paid: true, date: '2024-02-10' },
    ],
  },
];

export default function OrdersPage() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

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

  const totalSpent = mockOrders.reduce((sum, order) => sum + order.amount, 0);
  const activeOrders = mockOrders.filter((o) => o.status === 'active').length;
  const completedOrders = mockOrders.filter(
    (o) => o.status === 'completed'
  ).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="text-sm text-gray-500">
          Total spent:{' '}
          <span className="font-semibold text-gray-900">R{totalSpent}</span>
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
      {mockOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400">
            Visit a partner store to make your first purchase
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockOrders.map((order) => (
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
                      Order #{order.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">R{order.amount}</p>
                  <p className="text-xs text-gray-500">{order.date}</p>
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
                      <button className="w-full py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition">
                        Make a Payment
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
