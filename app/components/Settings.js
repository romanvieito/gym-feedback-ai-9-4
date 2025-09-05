import { useState } from 'react';
import Tooltip from './Tooltip';

const Settings = ({
  selectedFitnessGoal,
  selectedFocusArea,
  selectedFeedbackInterval,
  selectedWearable,
  preferencesLoaded,
  onFitnessGoalChange,
  onFocusAreaChange,
  onFeedbackIntervalChange,
  onWearableChange,
  fitnessGoals,
  focusAreas,
  feedbackIntervals,
  wearables,
  onClose
}) => {
  const [activeSection, setActiveSection] = useState(null);

  const SettingButton = ({ isActive, onClick, children, className = "" }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      } ${className}`}
      disabled={!preferencesLoaded}
    >
      {children}
    </button>
  );

  const SectionHeader = ({ icon, title, isOpen, onClick }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 text-gray-600 dark:text-gray-400">
          {icon}
        </div>
        <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
      </div>
      <svg
        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              aria-label="Close settings"
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {!preferencesLoaded && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading preferences...</span>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">

        {/* Fitness Goal */}
        <div className="border-b border-gray-100 dark:border-gray-800">
          <SectionHeader
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            title="Fitness Goal"
            isOpen={activeSection === 'goal'}
            onClick={() => setActiveSection(activeSection === 'goal' ? null : 'goal')}
          />
          
          {activeSection === 'goal' && (
            <div className="px-6 pb-4">
              {!preferencesLoaded ? (
                <LoadingSkeleton />
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {fitnessGoals.map((goal) => (
                    <SettingButton
                      key={goal.id}
                      isActive={selectedFitnessGoal === goal.id}
                      onClick={() => onFitnessGoalChange(goal.id)}
                      className="w-full justify-start"
                    >
                      {goal.name}
                    </SettingButton>
                  ))}
                </div>
              )}
              
              {selectedFitnessGoal && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {fitnessGoals.find(g => g.id === selectedFitnessGoal)?.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Focus Area */}
        <div className="border-b border-gray-100 dark:border-gray-800">
          <SectionHeader
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="Focus Area"
            isOpen={activeSection === 'focus'}
            onClick={() => setActiveSection(activeSection === 'focus' ? null : 'focus')}
          />
          
          {activeSection === 'focus' && (
            <div className="px-6 pb-4">
              {!preferencesLoaded ? (
                <LoadingSkeleton />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {focusAreas.map((area) => (
                    <SettingButton
                      key={area.id}
                      isActive={selectedFocusArea === area.id}
                      onClick={() => onFocusAreaChange(area.id)}
                      className="text-center"
                    >
                      {area.name}
                    </SettingButton>
                  ))}
                </div>
              )}
              
              {selectedFocusArea && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {focusAreas.find(a => a.id === selectedFocusArea)?.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Frequency */}
        <div className="border-b border-gray-100 dark:border-gray-800">
          <SectionHeader
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Feedback Frequency"
            isOpen={activeSection === 'feedback'}
            onClick={() => setActiveSection(activeSection === 'feedback' ? null : 'feedback')}
          />
          
          {activeSection === 'feedback' && (
            <div className="px-6 pb-4">
              {!preferencesLoaded ? (
                <LoadingSkeleton />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {feedbackIntervals.map((interval) => (
                    <SettingButton
                      key={interval.id}
                      isActive={selectedFeedbackInterval === interval.id}
                      onClick={() => onFeedbackIntervalChange(interval.id)}
                    >
                      {interval.name}
                    </SettingButton>
                  ))}
                </div>
              )}
              
              {selectedFeedbackInterval && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {feedbackIntervals.find(i => i.id === selectedFeedbackInterval)?.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wearable Device */}
        <div>
          <SectionHeader
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 0 1 8 0v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            title="Wearable Device"
            isOpen={activeSection === 'wearable'}
            onClick={() => setActiveSection(activeSection === 'wearable' ? null : 'wearable')}
          />
          
          {activeSection === 'wearable' && (
            <div className="px-6 pb-4">
              {!preferencesLoaded ? (
                <LoadingSkeleton />
              ) : (
                <div className="space-y-2">
                  {wearables.map((wearable) => (
                    <SettingButton
                      key={wearable.id}
                      isActive={selectedWearable === wearable.id}
                      onClick={() => onWearableChange(wearable.id)}
                      className="w-full justify-start"
                    >
                      {wearable.name}
                    </SettingButton>
                  ))}
                </div>
              )}

              {/* Help tooltip */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Tooltip content="Wearable devices help personalize your workout intensity and provide detailed analytics">
                  <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Why connect a wearable?
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
