import React from 'react';
import { exercises } from '../services/workoutData';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const Calendar: React.FC = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, () => null);
  const calendarCells = [...blanks, ...daysArray];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <strong>{today.toLocaleString('default', { month: 'long' })} {year}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {daysOfWeek.map((day) => (
          <div key={day} style={{ textAlign: 'center', fontWeight: 'bold' }}>{day}</div>
        ))}
        {calendarCells.map((day, idx) => (
          <div key={idx} style={{ textAlign: 'center', height: 64, padding: 2 }}>
            {day ? (
              <>
                <div style={{ fontWeight: 'bold' }}>{day}</div>
                <ul style={{ fontSize: 10, margin: 0, padding: 0, listStyle: 'none' }}>
                  {exercises.length > 0 &&
                    Array.from({ length: 3 }).map((_, i) => {
                      // Deterministically pick 3 exercises for each day
                      const exerciseIdx = ((day - 1) * 3 + i) % exercises.length;
                      return <li key={i}>{exercises[exerciseIdx]}</li>;
                    })}
                </ul>
              </>
            ) : ''}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar; 