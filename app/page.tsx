'use client'
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import App from '@/app/components/App'

export default function Home() {
  const [showApp, setShowApp] = useState(false);

  return (
    <main className="min-h-screen p-8 flex flex-col items-center">
      {!showApp ? (
        <div className="my-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">Workouts</h1>
          <Link 
            href="https://24up.fit" 
            className="absolute top-8 left-8 text-2xl hover:text-gray-600 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home
          </Link>
          <div className="flex flex-col gap-4 w-full max-w-md">
            <button 
              onClick={() => setShowApp(true)}
              className="text-center p-4 border rounded-lg hover:bg-gray-100"
            >
              DAY 1: Lose Weight in 14 days for free
              <p className="text-sm text-gray-600">Click to go to workout</p>
            </button>

            <div 
              className="p-4 border rounded-lg cursor-not-allowed opacity-50 relative"
            >
              <div className="flex items-center justify-center gap-2">
                DAY 2: Premium Workout
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-600">This exercise is available to premium users</p>
            </div>

            <div 
              className="p-4 border rounded-lg cursor-not-allowed opacity-50 relative"
            >
              <div className="flex items-center justify-center gap-2">
                DAY 3: Premium Workout
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-600">This exercise is available to premium users</p>
            </div>

            <Link 
              href="https://24up.fit/pricing"
              className="p-4 border rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50"
            >
              <span className="font-medium text-amber-800">Go Premium</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-amber-600"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <p className="text-sm text-amber-700">Unlock all premium workouts</p>
            </Link>

          </div>
        </div>
      ) : (
        <div className="mt-1">
          <button 
            onClick={() => setShowApp(false)}
            className="mb-2 text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to workouts
          </button>
          <App />
        </div>
      )}
    </main>
  );
}
