import React from 'react';
import { exercises } from '../services/workoutData';

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const Calendar: React.FC = () => {
  const today = new Date();
  
  // Calculate the start of the current week (Sunday)
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  
  // Generate the 7 days of the current week
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push(date);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          WEEK OF {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="border rounded-xl overflow-hidden shadow bg-white dark:bg-gray-900">
        <div className="grid grid-cols-7">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-2 px-2 text-xs font-bold text-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 uppercase">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weekDays.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div 
                key={index} 
                className={`h-24 flex flex-col items-center justify-start border-b border-r border-gray-200 dark:border-gray-700 p-2 ${
                  isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${
                  isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'
                }`}>
                  {date.getDate()}
                </div>
                <ul className="text-[11px] text-gray-600 dark:text-gray-300 list-none p-0 m-0 text-center">
                  {exercises.length > 0 &&
                    Array.from({ length: 3 }).map((_, i) => {
                      const exerciseIdx = (date.getDate() * 3 + i) % exercises.length;
                      return <li key={i}>{exercises[exerciseIdx]}</li>;
                    })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 