// app/(dashboard)/profile/page.tsx
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ProfileService } from '@/domains/user/profile/profileService';
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
  Edit2,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
  });

  if (!user) return null;

  const handleEdit = () => {
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedUser = await ProfileService.updateProfile(user.id, formData);
      setUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const profileFields = [
    { label: 'Full Name', value: user.fullName, icon: User, key: 'fullName' },
    { label: 'Email Address', value: user.email, icon: Mail, key: 'email' },
    {
      label: 'Phone Number',
      value: user.phoneNumber || 'Not provided',
      icon: Phone,
      key: 'phoneNumber',
    },
    {
      label: 'ID Number',
      value: user.idNumber
        ? user.idNumber.replace(/(\d{6})\d{7}/, '$1******')
        : 'Not provided',
      icon: IdCard,
      key: 'idNumber',
      editable: false,
    },
  ];

  const verificationSteps = [
    { name: 'Email Verification', completed: user.emailVerified || false, date: user.createdAt },
    { name: 'Phone Verification', completed: user.phoneVerified || false, date: user.phoneNumber ? user.createdAt : null },
    { name: 'ID Verification', completed: user.kycStatus === 'verified', date: user.kycStatus === 'verified' ? user.updatedAt : null },
    { name: 'Bank Statement', completed: user.tier >= 2, date: user.tier >= 2 ? user.updatedAt : null },
  ];

  const isVerified = user.kycStatus === 'verified';

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 text-teal-600 border border-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-50 transition"
          >
            <Edit2 size={16} />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Verification Status Banner */}
      <div
        className={`rounded-xl p-4 flex items-center gap-3 ${
          isVerified
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}
      >
        {isVerified ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        )}
        <div>
          <p
            className={`font-semibold ${
              isVerified ? 'text-green-800' : 'text-yellow-800'
            }`}
          >
            {isVerified
              ? 'Identity Verified'
              : 'Identity Verification Pending'}
          </p>
          <p
            className={`text-sm ${
              isVerified ? 'text-green-600' : 'text-yellow-600'
            }`}
          >
            {isVerified
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
            <div key={field.label} className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <field.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{field.label}</p>
                {isEditing && field.editable !== false ? (
                  <input
                    type={field.key === 'email' ? 'email' : 'text'}
                    value={formData[field.key as keyof typeof formData] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field.key]: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{field.value}</p>
                )}
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
                user.accountStatus === 'active' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {user.accountStatus === 'active' ? 'Active' : 'Suspended'}
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