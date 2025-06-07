import React from 'react';
import { exercises } from '../services/workoutData';

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const Calendar: React.FC = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  const blanks = Array.from({ length: firstDay }, () => null);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...daysArray];
  // Split into weeks
  const weeks: (number|null)[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{today.toLocaleString('default', { month: 'long' }).toUpperCase()} {year}</span>
      </div>
      <div className="border rounded-xl overflow-hidden shadow bg-white dark:bg-gray-900">
        <div className="grid grid-cols-7">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-2 px-2 text-xs font-bold text-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 uppercase">{day}</div>
          ))}
        </div>
        <div>
          {weeks.map((week, wIdx) => (
            <div className="grid grid-cols-7" key={wIdx}>
              {week.map((day, dIdx) => (
                <div key={dIdx} className="h-24 flex flex-col items-center justify-start border-b border-r border-gray-200 dark:border-gray-700 p-2">
                  {day ? (
                    <>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-1">{day}</div>
                      <ul className="text-[11px] text-gray-600 dark:text-gray-300 list-none p-0 m-0 text-center">
                        {exercises.length > 0 &&
                          Array.from({ length: 3 }).map((_, i) => {
                            const exerciseIdx = ((day - 1) * 3 + i) % exercises.length;
                            return <li key={i}>{exercises[exerciseIdx]}</li>;
                          })}
                      </ul>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 