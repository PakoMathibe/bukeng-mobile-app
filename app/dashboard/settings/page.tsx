// app/(dashboard)/settings/page.tsx
'use client';

import { useState } from 'react';
import {
  Bell,
  Lock,
  Shield,
  CreditCard,
  Globe,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    paymentReminders: true,
    promotionalEmails: false,
    smsAlerts: true,
    appNotifications: true,
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    biometricLogin: true,
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(`${key} preferences updated`);
  };

  const handleSecurityToggle = (key: keyof typeof security) => {
    setSecurity((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(
      `${key === 'twoFactorAuth' ? '2FA' : 'Biometric login'} ${
        !security[key] ? 'enabled' : 'disabled'
      }`
    );
  };

  const settingSections = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'paymentReminders',
          label: 'Payment Reminders',
          description: 'Get notified 48 hours before payments',
        },
        {
          key: 'smsAlerts',
          label: 'SMS Alerts',
          description: 'Receive SMS for important updates',
        },
        {
          key: 'appNotifications',
          label: 'App Notifications',
          description: 'Push notifications for offers and updates',
        },
        {
          key: 'promotionalEmails',
          label: 'Promotional Emails',
          description: 'Receive special offers and deals',
        },
      ],
    },
    {
      title: 'Security',
      icon: Lock,
      items: [
        {
          key: 'twoFactorAuth',
          label: 'Two-Factor Authentication',
          description: 'Add an extra layer of security',
        },
        {
          key: 'biometricLogin',
          label: 'Biometric Login',
          description: 'Use fingerprint or face ID to login',
        },
      ],
    },
    {
      title: 'Preferences',
      icon: Globe,
      items: [
        {
          key: 'language',
          label: 'Language',
          description: 'Choose your preferred language',
          type: 'select',
          value: 'English',
        },
        {
          key: 'currency',
          label: 'Currency',
          description: 'Display currency',
          type: 'select',
          value: 'ZAR - South African Rand',
        },
      ],
    },
  ];

  const handleChangePassword = () => {
    toast.info('Password Change', {
      description: 'In production, this would open a password change modal.',
    });
  };

  const handleManageCards = () => {
    toast.info('Payment Methods', {
      description: 'In production, this would show saved payment methods.',
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Theme Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-teal-600" />
              ) : (
                <Moon className="w-5 h-5 text-teal-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Theme</h3>
              <p className="text-sm text-gray-500">
                Choose your preferred appearance
              </p>
            </div>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as typeof theme)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Settings Sections */}
      {settingSections.map((section) => (
        <div
          key={section.title}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <section.icon size={18} />
              {section.title}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {section.items.map((item) => (
              <div
                key={item.key}
                className="px-6 py-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                {item.type === 'select' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{item.value}</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (item.key in notifications) {
                        handleNotificationToggle(
                          item.key as keyof typeof notifications
                        );
                      } else if (item.key in security) {
                        handleSecurityToggle(item.key as keyof typeof security);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications[item.key as keyof typeof notifications] ||
                      security[item.key as keyof typeof security]
                        ? 'bg-teal-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications[item.key as keyof typeof notifications] ||
                        security[item.key as keyof typeof security]
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard size={18} />
            Payment Methods
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">DebiCheck Mandate</p>
              <p className="text-sm text-gray-500">
                Active - Bank account linked
              </p>
            </div>
            <button
              onClick={handleManageCards}
              className="text-teal-600 text-sm font-semibold hover:underline"
            >
              Manage
            </button>
          </div>
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={18} />
            Security
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">
                Update your account password
              </p>
            </div>
            <button
              onClick={handleChangePassword}
              className="text-teal-600 text-sm font-semibold hover:underline"
            >
              Change
            </button>
          </div>
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">Active Sessions</p>
              <p className="text-sm text-gray-500">
                Manage devices where you're logged in
              </p>
            </div>
            <button className="text-teal-600 text-sm font-semibold hover:underline">
              Manage
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-800 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition">
          Delete Account
        </button>
      </div>
    </div>
  );
}
