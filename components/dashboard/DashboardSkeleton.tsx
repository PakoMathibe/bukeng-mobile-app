// components/dashboard/DashboardSkeleton.tsx
export function DashboardSkeleton() {
    return (
      <div className="space-y-5 pb-20 animate-pulse">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5">
          <div className="h-6 bg-teal-400 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-teal-400 rounded w-1/2 mb-4"></div>
          <div className="h-10 bg-teal-400 rounded-xl w-32"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl p-4">
              <div className="w-5 h-5 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-xl p-5">
          <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="h-2 bg-gray-200 rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl p-4">
              <div className="w-6 h-6 bg-gray-200 rounded mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }