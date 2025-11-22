import React from 'react';
import { ShiftType, AreaType, DaySchedule, Employee, EmployeeColor } from '../types';

// Color mapping function
const getColorValue = (color: EmployeeColor | undefined): string => {
  if (!color) return 'transparent';
  const colorMap: Record<EmployeeColor, string> = {
    'Rot': '#ef4444',
    'Braun': '#92400e',
    'Schwarz': '#1f2937',
    'Grün': '#10b981',
    'Violett': '#8b5cf6'
  };
  return colorMap[color];
};

interface EmployeeViewProps {
  schedule: DaySchedule[];
  weekSchedule: DaySchedule[];
  employees: Employee[];
  currentEmployeeId: string;
  currentWeekStart: string;
  onWeekChange: (direction: 'prev' | 'next') => void;
}

const SHIFT_TYPES: ShiftType[] = ['Frühschicht', 'Mittelschicht', 'Spätschicht'];
const AREAS: AreaType[] = ['Halle', 'Kasse', 'Sauna', 'Reinigung', 'Gastro'];
const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

// Minimum staffing requirements per area and shift
const MIN_STAFFING: Record<AreaType, Record<ShiftType, number>> = {
  'Halle': {
    'Frühschicht': 2,
    'Mittelschicht': 0,
    'Spätschicht': 2
  },
  'Kasse': {
    'Frühschicht': 1,
    'Mittelschicht': 0,
    'Spätschicht': 1
  },
  'Sauna': {
    'Frühschicht': 1,
    'Mittelschicht': 0,
    'Spätschicht': 1
  },
  'Reinigung': {
    'Frühschicht': 1,
    'Mittelschicht': 0,
    'Spätschicht': 1
  },
  'Gastro': {
    'Frühschicht': 1,
    'Mittelschicht': 0,
    'Spätschicht': 1
  }
};

const SHIFT_TIMES = {
  'Frühschicht': '06:00 - 14:00',
  'Mittelschicht': '14:00 - 22:00',
  'Spätschicht': '22:00 - 06:00'
};

export const EmployeeView: React.FC<EmployeeViewProps> = ({ 
  weekSchedule,
  employees, 
  currentEmployeeId,
  currentWeekStart,
  onWeekChange 
}) => {
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);

  const getMyWeekShifts = () => {
    const myShifts: Array<{ 
      date: string; 
      dayName: string;
      area: AreaType; 
      shift: ShiftType; 
      time: string 
    }> = [];

    weekSchedule.forEach((day, dayIndex) => {
      AREAS.forEach(area => {
        SHIFT_TYPES.forEach(shift => {
          const assignments = day.shifts[area]?.[shift];
          if (assignments?.some(a => a.employeeId === currentEmployeeId)) {
            myShifts.push({
              date: day.date,
              dayName: WEEKDAYS[dayIndex],
              area,
              shift,
              time: SHIFT_TIMES[shift]
            });
          }
        });
      });
    });

    return myShifts;
  };

  const myShifts = getMyWeekShifts();

  const getWeekRange = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  const isUnderStaffed = (area: AreaType, shift: ShiftType, assignmentCount: number): boolean => {
    const minRequired = MIN_STAFFING[area][shift];
    return assignmentCount < minRequired;
  };

  return (
    <div className="employee-view">
      <div className="employee-header">
        <h1>👤 Meine Schichten</h1>
        <div className="employee-name">
          {currentEmployee ? (
            <div className="employee-name-with-color">
              {currentEmployee.color && (
                <span 
                  className="employee-color-bar" 
                  style={{ backgroundColor: getColorValue(currentEmployee.color) }}
                  title={currentEmployee.color}
                ></span>
              )}
              <span className="employee-name-text">
                {currentEmployee.firstName} {currentEmployee.lastName}
              </span>
            </div>
          ) : (
            'Mitarbeiter'
          )}
        </div>
      </div>

      <div className="week-navigation">
        <button onClick={() => onWeekChange('prev')} className="btn-week-nav">
          ← Vorherige Woche
        </button>
        <div className="week-display">
          <strong>Woche:</strong> {getWeekRange()}
        </div>
        <button onClick={() => onWeekChange('next')} className="btn-week-nav">
          Nächste Woche →
        </button>
      </div>

      {myShifts.length > 0 ? (
        <div className="my-shifts">
          <h2>Meine Einsätze diese Woche</h2>
          <div className="shifts-grid">
            {myShifts.map((shift, index) => (
              <div key={index} className="shift-card">
                <div className="shift-card-header">
                  <h3>{shift.dayName}</h3>
                  <span className="shift-date">
                    {new Date(shift.date).toLocaleDateString('de-DE', { 
                      day: '2-digit', 
                      month: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="shift-card-body">
                  <div className="shift-info">
                    <span className="shift-type">{shift.shift}</span>
                    <span className="shift-time">{shift.time}</span>
                  </div>
                  <span className="shift-area">📍 {shift.area}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-shifts">
          <p>Keine Schichten für diese Woche eingeplant</p>
        </div>
      )}

      <div className="all-shifts-section">
        <h2>Gesamter Wochenplan</h2>
        
        {AREAS.map(area => (
          <div key={area} className="area-section">
            <h3 className="area-title">{area}</h3>
            <div className="area-table-wrapper">
              <table className="week-table">
                <thead>
                  <tr>
                    <th className="shift-header">Schicht</th>
                    {weekSchedule.map((day, index) => (
                      <th key={day.date} className="day-header">
                        <div className="day-name">{WEEKDAYS[index]}</div>
                        <div className="day-date">
                          {new Date(day.date).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SHIFT_TYPES.map(shift => (
                    <tr key={shift}>
                      <td className="shift-name">
                        <div>{shift}</div>
                        <div className="shift-time-small">{SHIFT_TIMES[shift]}</div>
                      </td>
                      {weekSchedule.map(day => {
                        const assignments = day.shifts[area]?.[shift] || [];
                        const isMyShift = assignments.some(a => a.employeeId === currentEmployeeId);
                        const underStaffed = isUnderStaffed(area, shift, assignments.length);
                        
                        return (
                          <td key={day.date} className={`shift-cell ${isMyShift ? 'my-shift' : ''} ${underStaffed ? 'understaffed' : ''}`}>
                            {assignments.length > 0 ? (
                              <div className="shift-content">
                                {assignments.map(assignment => (
                                  <div 
                                    key={assignment.employeeId} 
                                    className={`assignment-tag ${assignment.employeeId === currentEmployeeId ? 'highlight' : ''}`}
                                  >
                                    {assignment.employeeName}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="empty-slot">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
