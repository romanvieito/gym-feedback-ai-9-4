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
  const [selectedWearable, setSelectedWearable] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const wearables = [
    { id: 'none', name: 'No wearable device' },
    { id: 'apple', name: 'Apple Watch' },
    { id: 'whoop', name: 'Whoop' },
    { id: 'garmin', name: 'Garmin' },
    { id: 'fitbit', name: 'Fitbit' },
    { id: 'other', name: 'Other' }
  ];

  useEffect(() => {
    // Track page view when component mounts
    mixpanel.track('Page View', {
      page: 'Workouts Home',
      platform: 'web_app'
    });
  }, []);

  const handleWearableChange = (wearableId: string) => {
    setSelectedWearable(wearableId);
    mixpanel.track('Wearable Selected', {
      wearable: wearableId
    });
  };

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
        <div className="w-full max-w-4xl px-2 sm:px-4 pt-4 sm:pt-8">
          <div className="flex flex-row justify-between items-center mb-4 sm:mb-5 w-full">
            <Link 
              href="https://24up.fit" 
              className="text-xs sm:text-sm hover:text-gray-600 flex items-center gap-2 font-medium"
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
            <div className="flex items-center gap-2">
              {/* Menu Button */}
              <div className="relative">
                <button
                  className="text-xs sm:text-sm p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={showMenu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="sr-only">Open menu</span>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-64 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    <label htmlFor="wearable-select" className="block text-xs sm:text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Select Wearable</label>
                    <select
                      id="wearable-select"
                      value={selectedWearable}
                      onChange={(e) => handleWearableChange(e.target.value)}
                      className="w-full text-xs sm:text-sm p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent mb-2"
                    >
                      {wearables.map((wearable) => (
                        <option key={wearable.id} value={wearable.id}>
                          {wearable.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-start gap-2 mt-2">
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
                        className="text-gray-400 mt-1"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                          Connect your wearable device to:
                        </p>
                        <ul className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Get personalized workout intensity recommendations</li>
                          <li>• Monitor your recovery between sessions</li>
                          <li>• View detailed performance analytics</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 text-center tracking-tighter">Workouts</h1>
          <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-md mx-auto">
            <button 
              onClick={handleWorkoutClick}
              className="text-center p-3 sm:p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center group border border-gray-200 dark:border-gray-800 transition-all duration-200"
            >
              <Image
                src="/images/1.png"
                alt="Chest and Back workout"
                width={40}
                height={40}
                className="rounded-lg mr-2 sm:mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-xs sm:text-base">DAY 1</div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Lose Weight with Ease</p>
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
              className="p-3 sm:p-6 rounded-xl flex items-center border border-gray-200 dark:border-gray-800 opacity-50"
            >
              <Image
                src="/images/3.png"
                alt="Shoulders and Leg workout"
                width={40}
                height={40}
                className="rounded-lg mr-2 sm:mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div className="text-xs sm:text-base">DAY 2</div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Shoulders & Leg</p>
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
              className="p-3 sm:p-6 rounded-xl flex items-center border border-gray-200 dark:border-gray-800 opacity-50"
            >
              <Image
                src="/images/2.png"
                alt="Quadriceps and Back workout"
                width={40}
                height={40}
                className="rounded-lg mr-2 sm:mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div className="text-xs sm:text-base">DAY 3</div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Yoga for Beginners</p>
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
              className="p-3 sm:p-6 rounded-xl flex items-center border border-gray-200 dark:border-gray-800 opacity-50"
            >
              <Image
                src="/images/4.png"
                alt="Biceps and Back workout"
                width={40}
                height={40}
                className="rounded-lg mr-2 sm:mr-4 object-cover"
              />
              <div className="flex-1 text-left">
                <div className="text-xs sm:text-base">DAY 4</div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Biceps and Back</p>
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
              className="p-3 sm:p-6 rounded-xl bg-black hover:bg-gray-900 text-white flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 transition-all duration-200"
            >
              <span className="font-medium text-xs sm:text-base">Go Premium</span>
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
                className="text-white"
              >
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
              </svg>
              <p className="text-xs sm:text-sm text-gray-200">Unlock Every Workout!</p>
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
