'use client'
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import App from '@/app/components/App'
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
  const [showWearableHelp, setShowWearableHelp] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
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
          <div className="flex flex-row justify-between items-center mb-4 sm:mb-5 w-full">
            <Link 
              href="/"
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
                  <div className="absolute right-0 mt-2 w-64 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20">
                    <div className="mb-3">
                      <span className="block text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Settings</span>
                      {!preferencesLoaded && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                          ⏳ Loading preferences...
                        </div>
                      )}
                    </div>
                    
                    {/* Fitness Goal Selection - FIRST PRIORITY */}
                    <div className="mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="text-green-500"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <label htmlFor="fitness-goal-select" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Fitness Goal</label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Choose your primary fitness objective.</p>
                    <select
                      id="fitness-goal-select"
                      value={selectedFitnessGoal}
                      onChange={(e) => handleFitnessGoalChange(e.target.value)}
                      disabled={!preferencesLoaded}
                      className={`w-full text-xs sm:text-sm p-2 rounded-lg border-2 border-green-200 dark:border-green-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-400 dark:focus:border-green-600 transition-all duration-150 shadow-sm hover:border-green-400 dark:hover:border-green-500 mb-2 outline-none ${
                        !preferencesLoaded ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {!preferencesLoaded ? (
                        <option value="">Loading preferences...</option>
                      ) : (
                        <>
                          <option value="">Select your fitness goal</option>
                          {fitnessGoals.map((goal) => (
                            <option key={goal.id} value={goal.id}>
                              {goal.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    
                    {/* Display selected goal description */}
                    {selectedFitnessGoal && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                        {fitnessGoals.find(g => g.id === selectedFitnessGoal)?.description}
                      </div>
                    )}
                    
                    {/* Focus Area Targeting - SECOND PRIORITY */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                    <div className="mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="text-purple-500"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <label htmlFor="focus-area-select" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Focus Area Targeting</label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Choose which body areas to focus on during workouts.</p>
                    <select
                      id="focus-area-select"
                      value={selectedFocusArea}
                      onChange={(e) => handleFocusAreaChange(e.target.value)}
                      disabled={!preferencesLoaded}
                      className={`w-full text-xs sm:text-sm p-2 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-400 dark:focus:border-purple-600 transition-all duration-150 shadow-sm hover:border-purple-400 dark:hover:border-purple-500 mb-2 outline-none ${
                        !preferencesLoaded ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {!preferencesLoaded ? (
                        <option value="">Loading preferences...</option>
                      ) : (
                        <>
                          <option value="">Select focus area</option>
                          {focusAreas.map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>

                    {/* Display selected focus area description */}
                    {selectedFocusArea && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 mb-3">
                        {focusAreas.find(a => a.id === selectedFocusArea)?.description}
                      </div>
                    )}

                    {/* Feedback Interval - THIRD PRIORITY */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                    <div className="mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="text-orange-500"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <label htmlFor="feedback-interval-select" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Coach Feedback Frequency</label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">How often should the coach provide feedback during workouts?</p>
                    <select
                      id="feedback-interval-select"
                      value={selectedFeedbackInterval}
                      onChange={(e) => handleFeedbackIntervalChange(e.target.value)}
                      disabled={!preferencesLoaded}
                      className={`w-full text-xs sm:text-sm p-2 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-400 dark:focus:border-orange-600 transition-all duration-150 shadow-sm hover:border-orange-400 dark:hover:border-orange-500 mb-2 outline-none ${
                        !preferencesLoaded ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {!preferencesLoaded ? (
                        <option value="">Loading preferences...</option>
                      ) : (
                        <>
                          <option value="">Select feedback frequency</option>
                          {feedbackIntervals.map((interval) => (
                            <option key={interval.id} value={interval.id}>
                              {interval.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>

                    {/* Display selected feedback interval description */}
                    {selectedFeedbackInterval && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 mb-3">
                        {feedbackIntervals.find(i => i.id === selectedFeedbackInterval)?.description}
                      </div>
                    )}

                    {/* Wearable Selection - FOURTH PRIORITY */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                    <div className="mb-2 flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="text-blue-500"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 0 1 8 0v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <label htmlFor="wearable-select" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Select Wearable</label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Connect your device for personalized recommendations.</p>
                    <select
                      id="wearable-select"
                      value={selectedWearable}
                      onChange={(e) => handleWearableChange(e.target.value)}
                      disabled={!preferencesLoaded}
                      className={`w-full text-xs sm:text-sm p-2 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-400 dark:focus:border-blue-600 transition-all duration-150 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 mb-2 outline-none ${
                        !preferencesLoaded ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {!preferencesLoaded ? (
                        <option value="">Loading preferences...</option>
                      ) : (
                        wearables.map((wearable) => (
                          <option key={wearable.id} value={wearable.id}>
                            {wearable.name}
                          </option>
                        ))
                      )}
                    </select>

                    {/* Help Option for Wearable Info */}
                    <div className="relative mt-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                        onClick={() => setShowWearableHelp((prev) => !prev)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          className="inline-block text-blue-500"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                        Help
                      </button>
                      {showWearableHelp && (
                        <div className="absolute left-0 mt-2 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30">
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1">
                            Connect your wearable device to:
                          </p>
                          <ul className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <li>• Get personalized workout intensity recommendations</li>
                            <li>• Monitor your recovery between sessions</li>
                            <li>• View detailed performance analytics</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 text-center tracking-tighter">Workouts</h1> */}
          <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-md mx-auto">
            {workoutTypes.map((workout, index) => (
              <button 
                key={workout.title}
                onClick={() => handleWorkoutClick(workout)}
                className="text-center p-3 sm:p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center group border border-gray-200 dark:border-gray-800 transition-all duration-200"
              >
                <Image
                  src={workout.image}
                  alt={workout.title}
                  width={40}
                  height={40}
                  className="rounded-lg mr-2 sm:mr-4 object-cover"
                />
                <div className="flex-1 text-left">
                  <div className="font-medium text-xs sm:text-base">DAY {index + 1}</div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{workout.title}</p>
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
            ))}

            <Link 
              href={premiumLink}
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
            ← Home
          </button>
          <App 
            selectedFitnessGoal={selectedFitnessGoal}
            selectedFocusArea={selectedFocusArea}
            selectedFeedbackInterval={selectedFeedbackInterval}
            selectedWearable={selectedWearable}
            selectedWorkout={selectedWorkout}
          />
        </div>
      )}
    </main>
  );
}
