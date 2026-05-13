// app/(dashboard)/profile/page.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import {
  User,
  Mail,
  Phone,
  IdCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const profileFields = [
    { label: 'Full Name', value: user.fullName, icon: User },
    { label: 'Email Address', value: user.email, icon: Mail },
    {
      label: 'Phone Number',
      value: user.phoneNumber || 'Not provided',
      icon: Phone,
    },
    {
      label: 'ID Number',
      value: user.idNumber
        ? user.idNumber.replace(/(\d{6})\d{7}/, '$1******')
        : 'Not provided',
      icon: IdCard,
    },
  ];

  const verificationSteps = [
    { name: 'Email Verification', completed: true, date: user.createdAt },
    {
      name: 'Phone Verification',
      completed: !!user.phoneNumber,
      date: user.phoneNumber ? user.createdAt : null,
    },
    {
      name: 'ID Verification',
      completed: user.isVerified,
      date: user.isVerified ? user.updatedAt : null,
    },
    {
      name: 'Bank Statement',
      completed: user.tier >= 2,
      date: user.tier >= 2 ? user.updatedAt : null,
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Verification Status Banner */}
      <div
        className={`rounded-xl p-4 flex items-center gap-3 ${
          user.isVerified
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}
      >
        {user.isVerified ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        )}
        <div>
          <p
            className={`font-semibold ${
              user.isVerified ? 'text-green-800' : 'text-yellow-800'
            }`}
          >
            {user.isVerified
              ? 'Identity Verified'
              : 'Identity Verification Pending'}
          </p>
          <p
            className={`text-sm ${
              user.isVerified ? 'text-green-600' : 'text-yellow-600'
            }`}
          >
            {user.isVerified
              ? 'Your FICA verification is complete. You have access to full credit limits.'
              : 'Complete identity verification to increase your credit limit from R500 to R1000+'}
          </p>
        </div>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User size={18} />
            Personal Information
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {profileFields.map((field) => (
            <div
              key={field.label}
              className="px-6 py-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <field.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{field.label}</p>
                <p className="font-medium text-gray-900">{field.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Progress */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={18} />
            Verification Progress
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {verificationSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gray-400">
                      Completed {format(new Date(step.date), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
                {step.completed && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Stats */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Member Since</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {format(new Date(user.createdAt), 'dd MMM yyyy')}
            </span>
          </div>
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Account Status</span>
            </div>
            <span
              className={`text-sm font-medium ${
                user.isActive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {user.isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Account Tier</span>
            </div>
            <span className="text-sm font-medium text-teal-600">
              {user.tier === 0
                ? 'Explorer'
                : user.tier === 1
                ? 'Verified'
                : user.tier === 2
                ? 'Trusted'
                : 'Premium'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
