'use client'
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import App from '@/app/components/App'
import Tooltip from '@/app/components/Tooltip'
import ProgressDashboard from '@/app/components/ProgressDashboard'
import Settings from '@/app/components/Settings'
import mixpanel from 'mixpanel-browser';
import { workoutTypes } from './services/workoutData';

// Initialize Mixpanel with your project token
mixpanel.init('b98359528baa013898b40c8583f849ce', {   
  debug: true,
  track_pageview: false,
  persistence: "localStorage", });

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [selectedWearable, setSelectedWearable] = useState('');
  const [selectedFitnessGoal, setSelectedFitnessGoal] = useState('');
  const [selectedFocusArea, setSelectedFocusArea] = useState('');
  const [selectedFeedbackInterval, setSelectedFeedbackInterval] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const premiumLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || 'https://24up.site/pricing';

  const wearables = [
    { id: 'none', name: 'No wearable device' },
    { id: 'apple', name: 'Apple Watch' },
    { id: 'whoop', name: 'Whoop' },
    { id: 'garmin', name: 'Garmin' },
    { id: 'fitbit', name: 'Fitbit' },
    { id: 'other', name: 'Other' }
  ];

  const fitnessGoals = [
    { id: 'lose-weight', name: '🔥 Lose weight', description: 'Burn calories and shed pounds' },
    { id: 'build-muscle', name: '💪 Build muscle', description: 'Gain strength and muscle mass' },
    { id: 'improve-endurance', name: '🏃‍♂️ Improve endurance/cardio', description: 'Increase stamina and cardiovascular health' },
    { id: 'flexibility', name: '🧘 Increase flexibility & mobility', description: 'Improve range of motion' },
    { id: 'boost-energy', name: '💥 Boost energy and daily performance', description: 'Enhance overall vitality' },
    { id: 'recover-injury', name: '🛠️ Recover from injury', description: 'Rehabilitate and regain strength after injury' },
    { id: 'stay-active', name: '🙌 Just want to stay active', description: 'Maintain a healthy and active lifestyle' }
  ];

  const focusAreas = [
    { id: 'upper-body', name: '💪 Upper body', description: 'Chest, shoulders, arms, and back' },
    { id: 'lower-body', name: '🦵 Lower body', description: 'Legs, glutes, and calves' },
    { id: 'core', name: '🔥 Core', description: 'Abs, obliques, and lower back' },
    { id: 'full-body', name: '🌟 Full body', description: 'Complete body workout' }
  ];

  const feedbackIntervals = [
    { id: '1min', name: '⚡ Every 1 minute', description: 'Frequent feedback for intensive coaching', value: 60 },
    { id: '2min', name: '🎯 Every 2 minutes', description: 'Balanced feedback for steady progress', value: 120 },
    { id: '5min', name: '🕐 Every 5 minutes', description: 'Minimal feedback for focused workouts', value: 300 }
  ];

  useEffect(() => {
    // Track page view when component mounts
    mixpanel.track('Page View', {
      page: 'Workouts Home',
      platform: 'web_app'
    });
  }, []);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Load saved preferences from localStorage and database
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        // Get or create a consistent user ID for this session
        let userId = sessionStorage.getItem('sessionUserId');
        if (!userId) {
          userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('sessionUserId', userId);
        }

        // First load from localStorage as fallback
        const savedWearable = localStorage.getItem('selectedWearable');
        const savedFitnessGoal = localStorage.getItem('selectedFitnessGoal');
        const savedFocusArea = localStorage.getItem('selectedFocusArea');
        const savedFeedbackInterval = localStorage.getItem('selectedFeedbackInterval');
        
        console.log('Loading saved preferences from localStorage:', { savedWearable, savedFitnessGoal, savedFocusArea, savedFeedbackInterval });
        
        // Set initial values from localStorage
        if (savedWearable) setSelectedWearable(savedWearable);
        if (savedFitnessGoal) setSelectedFitnessGoal(savedFitnessGoal);
        if (savedFocusArea) setSelectedFocusArea(savedFocusArea);
        if (savedFeedbackInterval) setSelectedFeedbackInterval(savedFeedbackInterval);
        
        // Then try to load from database and override localStorage values
        const response = await fetch(`/api/user-settings?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const settings = data.data;
            console.log('Loaded user settings from database:', settings);
            
            // Update state with database values (these take precedence)
            if (settings.fitness_goal) {
              setSelectedFitnessGoal(settings.fitness_goal);
              localStorage.setItem('selectedFitnessGoal', settings.fitness_goal);
            }
            if (settings.focus_area) {
              setSelectedFocusArea(settings.focus_area);
              localStorage.setItem('selectedFocusArea', settings.focus_area);
            }
            if (settings.wearable) {
              setSelectedWearable(settings.wearable);
              localStorage.setItem('selectedWearable', settings.wearable);
            }
            if (settings.feedback_interval) {
              setSelectedFeedbackInterval(settings.feedback_interval);
              localStorage.setItem('selectedFeedbackInterval', settings.feedback_interval);
            }
          }
        } else {
          console.log('No existing user settings found in database, using localStorage values');
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
        // Continue with localStorage values if database fails
      } finally {
        setPreferencesLoaded(true);
      }
    };
    
    loadUserSettings();
  }, []);

  // Helper function to save all settings to database
  const saveAllSettingsToDatabase = async (updatedSetting?: {
    fitnessGoal?: string;
    focusArea?: string;
    wearable?: string;
    feedbackInterval?: string;
  }) => {
    try {
      const userId = sessionStorage.getItem('sessionUserId');
      if (!userId) {
        console.error('No user ID found for saving settings');
        return;
      }

      // Get all current settings from state
      const allSettings = {
        fitnessGoal: selectedFitnessGoal,
        focusArea: selectedFocusArea,
        wearable: selectedWearable,
        feedbackInterval: selectedFeedbackInterval,
        // Override with any updated setting
        ...updatedSetting
      };

      console.log('Saving all settings to database:', allSettings);

      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...allSettings,
          updateExisting: true,
        }),
      });
      
      if (response.ok) {
        console.log('User settings saved successfully to database');
      } else {
        console.error('Failed to save user settings to database');
      }
    } catch (error) {
      console.error('Failed to save user settings to database:', error);
    }
  };

  const handleWearableChange = async (wearableId: string) => {
    setSelectedWearable(wearableId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedWearable', wearableId);
    }
    
    // Save all settings to database with the updated wearable
    await saveAllSettingsToDatabase({ wearable: wearableId });
    
    mixpanel.track('Wearable Selected', {
      wearable: wearableId,
      location: 'settings_menu',
    });
  };

  const handleFitnessGoalChange = async (goalId: string) => {
    console.log('Fitness goal changed to:', goalId);
    setSelectedFitnessGoal(goalId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFitnessGoal', goalId);
    }
    
    // Save all settings to database with the updated fitness goal
    await saveAllSettingsToDatabase({ fitnessGoal: goalId });
    
    mixpanel.track('Fitness Goal Selected', {
      goal: goalId,
      location: 'settings_menu',
    });
  };

  const handleFocusAreaChange = async (focusAreaId: string) => {
    console.log('Focus area changed to:', focusAreaId);
    setSelectedFocusArea(focusAreaId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFocusArea', focusAreaId);
    }
    
    // Save all settings to database with the updated focus area
    await saveAllSettingsToDatabase({ focusArea: focusAreaId });
    
    mixpanel.track('Focus Area Selected', {
      focusArea: focusAreaId,
      location: 'settings_menu',
    });
  };

  const handleFeedbackIntervalChange = async (intervalId: string) => {
    console.log('Feedback interval changed to:', intervalId);
    setSelectedFeedbackInterval(intervalId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFeedbackInterval', intervalId);
    }
    
    // Save all settings to database with the updated feedback interval
    await saveAllSettingsToDatabase({ feedbackInterval: intervalId });
    
    mixpanel.track('Feedback Interval Selected', {
      feedbackInterval: intervalId,
      location: 'settings_menu',
    });
  };

  const handleWorkoutClick = (workout: any) => {
    setSelectedWorkout(workout);
    mixpanel.track('Workout Started', {
      workout: workout.title,
      name: workout.title,
      location: 'workout_list',
      fitnessGoal: selectedFitnessGoal || 'none',
      focusArea: selectedFocusArea || 'none',
      feedbackInterval: selectedFeedbackInterval || 'none',
      wearable: selectedWearable || 'none',
    });
    setShowApp(true);
  };

  const handleBackClick = () => {
    mixpanel.track('Return to Workouts', {
      location: 'workout_app',
    });
    setShowApp(false);
    setSelectedWorkout(null);
  };

  const handlePremiumClick = () => {
    mixpanel.track('Premium Link Clicked', {
      location: 'workout_list',
      href: premiumLink,
      isStripe: premiumLink.includes('stripe.com'),
    });
  };



  return (
    <main className="min-h-screen p-2 flex flex-col items-center bg-white dark:bg-black">
      {!showApp ? (
        <div className="w-full max-w-4xl px-2 sm:px-4 pt-4 sm:pt-8">
          {/* Header Section */}
          <div className="flex flex-row justify-between items-center mb-6 sm:mb-8 w-full">
            <Tooltip content="Return to the main workout selection page">
              <Link 
                href="/"
                className="text-sm hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-2 font-medium transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
            </Tooltip>
            <div className="flex items-center gap-3">
              {/* Progress Button */}
              <Tooltip content="View your workout progress and statistics">
                <button
                  className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 flex items-center justify-center"
                  onClick={() => setShowProgressDashboard(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="sr-only">Your Progress</span>
                </button>
              </Tooltip>
              
              {/* Menu Button */}
              <div className="relative" ref={menuRef}>
                <Tooltip content="Customize your workout preferences">
                  <button
                    className={`w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center ${
                      showMenu
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 hover:shadow-md'
                    }`}
                    onClick={() => setShowMenu((prev) => !prev)}
                    aria-haspopup="true"
                    aria-expanded={showMenu}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className={`transition-transform duration-200 ${showMenu ? 'rotate-90' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="sr-only">Settings</span>
                  </button>
                </Tooltip>
                {showMenu && (
                  <div className="absolute right-0 mt-2 z-20">
                    <Settings
                      selectedFitnessGoal={selectedFitnessGoal}
                      selectedFocusArea={selectedFocusArea}
                      selectedFeedbackInterval={selectedFeedbackInterval}
                      selectedWearable={selectedWearable}
                      preferencesLoaded={preferencesLoaded}
                      onFitnessGoalChange={handleFitnessGoalChange}
                      onFocusAreaChange={handleFocusAreaChange}
                      onFeedbackIntervalChange={handleFeedbackIntervalChange}
                      onWearableChange={handleWearableChange}
                      onClose={() => setShowMenu(false)}
                      fitnessGoals={fitnessGoals}
                      focusAreas={focusAreas}
                      feedbackIntervals={feedbackIntervals}
                      wearables={wearables}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-800">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  AI Workout Challenges
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Pick a challenge, feel the workout like a game.
                </p>
              </div>
            </div>

            {/* Workout Challenges Section */}
            <div className="p-6">
              <div className="space-y-3">
                {workoutTypes.map((workout, index) => (
                  <Tooltip key={workout.title} content={`Start ${workout.title} challenge - Click to begin your workout with AI-powered form feedback`}>
                    <button 
                      onClick={() => handleWorkoutClick(workout)}
                      className="w-full p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center group border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative">
                          <Image
                            src={workout.image}
                            alt={workout.title}
                            width={48}
                            height={48}
                            className="rounded-lg object-cover"
                          />
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                            {workout.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {workout.duration} • {workout.description}
                          </div>
                        </div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </Tooltip>
                ))}
              </div>

              {/* Premium Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Tooltip content="Upgrade to premium to access all workout challenges and advanced features">
                  <Link 
                    href={premiumLink}
                    onClick={handlePremiumClick}
                    className="block p-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 dark:from-white dark:to-gray-100 dark:hover:from-gray-100 dark:hover:to-gray-200 text-white dark:text-gray-900 flex items-center justify-center gap-3 transition-all duration-200 hover:shadow-lg group"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor" 
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-yellow-400 dark:text-yellow-600"
                      >
                        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                      </svg>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Go Premium</div>
                        <div className="text-xs text-gray-200 dark:text-gray-600">Unlock Every Workout!</div>
                      </div>
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
                      className="text-gray-300 dark:text-gray-600 group-hover:text-white dark:group-hover:text-gray-900 transition-colors"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </Link>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 w-full max-w-4xl">
          <Tooltip content="Return to workout selection page">
            <button 
              onClick={handleBackClick}
              className="mb-6 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center gap-2"
            >
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
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Challenges
            </button>
          </Tooltip>
          <App 
            selectedFitnessGoal={selectedFitnessGoal}
            selectedFocusArea={selectedFocusArea}
            selectedFeedbackInterval={selectedFeedbackInterval}
            selectedWearable={selectedWearable}
            selectedWorkout={selectedWorkout}
          />
        </div>
      )}
      
      {/* Progress Dashboard */}
      <ProgressDashboard
        isOpen={showProgressDashboard}
        onClose={() => setShowProgressDashboard(false)}
      />
    </main>
  );
}
