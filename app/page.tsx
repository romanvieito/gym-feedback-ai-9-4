'use client'
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import App from '@/app/components/App'
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel with your project token
mixpanel.init('b98359528baa013898b40c8583f849ce', {   
  debug: true,
  track_pageview: false,
  persistence: "localStorage", });

export default function Home() {
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    // Track page view when component mounts
    mixpanel.track('Page View', {
      page: 'Workouts Home',
      platform: 'web_app'
    });
  }, []);

  const handleWorkoutClick = () => {
    mixpanel.track('Workout Started', {
      workout: 'Day 1',
      name: 'Lose Weight with Ease'
    });
    setShowApp(true);
  };

  const handleBackClick = () => {
    mixpanel.track('Return to Workouts');
    setShowApp(false);
  };

  const handlePremiumClick = () => {
    mixpanel.track('Premium Link Clicked');
  };

  return (
    <main className="min-h-screen p-2 flex flex-col items-center bg-white dark:bg-black">
      {!showApp ? (
        <div className="my-auto w-full max-w-4xl px-4">
          <h1 className="text-4xl font-bold mb-12 text-center tracking-tighter">Workouts</h1>
          <Link 
            href="https://24up.fit" 
            className="absolute top-8 left-8 text-sm hover:text-gray-600 flex items-center gap-2 font-medium"
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
          <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
            <button 
              onClick={handleWorkoutClick}
              className="text-center p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center group border border-gray-200 dark:border-gray-800 transition-all duration-200"
            >
              <Image
                src="/images/1.png"
                alt="Chest and Back workout"
                width={60}
                height={60}
                className="rounded-lg mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div className="font-medium">DAY 1</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lose Weight with Ease</p>
              </div>
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
                className="text-gray-400 group-hover:text-gray-600 transition-colors"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <div 
              className="p-6 rounded-xl flex items-center border border-gray-200 dark:border-gray-800 opacity-50"
            >
              <Image
                src="/images/3.png"
                alt="Shoulders and Leg workout"
                width={60}
                height={60}
                className="rounded-lg mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div>DAY 2</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Shoulders & Leg</p>
              </div>
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

            <div 
              className="p-6 rounded-xl flex items-center border border-gray-200 dark:border-gray-800 opacity-50"
            >
              <Image
                src="/images/2.png"
                alt="Quadriceps and Back workout"
                width={60}
                height={60}
                className="rounded-lg mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div>DAY 3</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Yoga for Beginners</p>
              </div>
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

            <div 
              className="p-6 rounded-xl flex items-center border border-gray-200 dark:border-gray-800 opacity-50"
            >
              <Image
                src="/images/4.png"
                alt="Biceps and Back workout"
                width={60}
                height={60}
                className="rounded-lg mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div>DAY 4</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Biceps and Back</p>
              </div>
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

            <Link 
              href="https://24up.fit/pricing"
              onClick={handlePremiumClick}
              className="p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-800 transition-all duration-200"
            >
              <span className="font-medium">Go Premium</span>
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
                className="text-current"
              >
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unlock Every Workout Today!</p>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 w-full max-w-4xl">
          <button 
            onClick={handleBackClick}
            className="mb-6 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            ← Back to Workouts
          </button>
          <App />
        </div>
      )}
    </main>
  );
}
