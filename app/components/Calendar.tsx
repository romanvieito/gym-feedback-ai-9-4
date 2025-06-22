import React from 'react';
import { exercises } from '../services/workoutData';

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const Calendar: React.FC = () => {
  const today = new Date();
  
  // Generate the 7 days starting from today
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    weekDays.push(date);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          WEEK OF {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="border rounded-xl overflow-hidden shadow bg-white dark:bg-gray-900">
        <div className="flex flex-col">
          {weekDays.map((date, index) => (
            <div 
              key={index} 
              className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex flex-col items-center justify-center w-16 mr-4">
                <div className="text-xs font-bold text-gray-500 uppercase">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {date.getDate()}
                </div>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 list-none p-0 m-0">
                {exercises.length > 0 &&
                  Array.from({ length: 3 }).map((_, i) => {
                    const exerciseIdx = (date.getDate() * 3 + i) % exercises.length;
                    return <li key={i}>{exercises[exerciseIdx]}</li>;
                  })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 