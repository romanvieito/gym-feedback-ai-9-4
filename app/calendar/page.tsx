import Link from 'next/link';

export default function CalendarPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">📅 Calendar</h1>
          <Link href="/" className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to Home</Link>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-full h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 mb-4">
            <span className="text-lg text-gray-400 dark:text-gray-500">[Calendar Component Coming Soon]</span>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-300 text-sm">We're building a calendar to help you track your workouts, progress, and more. Stay tuned!</p>
        </div>
      </div>
    </main>
  );
} 