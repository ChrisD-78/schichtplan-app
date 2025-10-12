import React, { useState, useEffect } from 'react';
import { AdminView } from './components/AdminView';
import { EmployeeView } from './components/EmployeeView';
import { DaySchedule, Employee } from './types';
import './App.css';

type ViewMode = 'admin' | 'employee';

const STORAGE_KEY_SCHEDULE = 'schichtplan_schedule';
const STORAGE_KEY_EMPLOYEES = 'schichtplan_employees';
const STORAGE_KEY_VIEW = 'schichtplan_view';
const STORAGE_KEY_CURRENT_EMPLOYEE = 'schichtplan_current_employee';
const STORAGE_KEY_CURRENT_WEEK = 'schichtplan_current_week';

// Helper function to get Monday of a given week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

// Helper function to format week identifier (e.g., "2025-W42")
const getWeekIdentifier = (monday: Date): string => {
  const year = monday.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = monday.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const weekNumber = Math.ceil(diff / oneWeek);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

// Initial demo data - creates a week schedule from Monday to Sunday
const getInitialSchedule = (): DaySchedule[] => {
  const saved = localStorage.getItem(STORAGE_KEY_SCHEDULE);
  if (saved) {
    return JSON.parse(saved);
  }

  const monday = getMondayOfWeek(new Date());
  const dates: DaySchedule[] = [];

  // Create 7 days from Monday to Sunday
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push({
      date: date.toISOString().split('T')[0],
      shifts: {
        'Halle': {},
        'Kasse': {},
        'Sauna': {},
        'Reinigung': {},
        'Gastro': {}
      }
    });
  }

  return dates;
};

const getInitialEmployees = (): Employee[] => {
  const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migrate old data
      return parsed.map((emp: any) => {
        // If old format with just 'name', split it
        if (emp.name && !emp.firstName && !emp.lastName) {
          const nameParts = emp.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          return {
            ...emp,
            firstName,
            lastName,
            areas: emp.areas && Array.isArray(emp.areas) && emp.areas.length > 0 ? emp.areas : ['Halle']
          };
        }
        
        // If no areas, assign default
        if (!emp.areas || !Array.isArray(emp.areas) || emp.areas.length === 0) {
          return {
            ...emp,
            areas: ['Halle']
          };
        }
        
        return emp;
      });
    } catch (e) {
      console.error('Error parsing employee data, using defaults:', e);
      localStorage.removeItem(STORAGE_KEY_EMPLOYEES);
    }
  }

  return [
    { id: '1', firstName: 'Max', lastName: 'Mustermann', areas: ['Halle'] },
    { id: '2', firstName: 'Anna', lastName: 'Schmidt', areas: ['Kasse', 'Gastro'] },
    { id: '3', firstName: 'Tom', lastName: 'Weber', areas: ['Sauna'] },
    { id: '4', firstName: 'Lisa', lastName: 'Müller', areas: ['Reinigung'] },
    { id: '5', firstName: 'Jan', lastName: 'Klein', areas: ['Halle', 'Kasse'] }
  ];
};

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem(STORAGE_KEY_VIEW) as ViewMode) || 'admin'
  );
  const [schedule, setSchedule] = useState<DaySchedule[]>(getInitialSchedule);
  const [employees, setEmployees] = useState<Employee[]>(getInitialEmployees);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(
    localStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE) || employees[0]?.id || ''
  );
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_WEEK);
    if (saved) return saved;
    return getMondayOfWeek(new Date()).toISOString().split('T')[0];
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE, currentEmployeeId);
  }, [currentEmployeeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_WEEK, currentWeekStart);
  }, [currentWeekStart]);

  const handleScheduleUpdate = (newSchedule: DaySchedule[]) => {
    setSchedule(newSchedule);
  };

  const handleEmployeesUpdate = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
  };

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const getCurrentWeekSchedule = (): DaySchedule[] => {
    const weekStart = new Date(currentWeekStart);
    const weekSchedule: DaySchedule[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      let daySchedule = schedule.find(s => s.date === dateStr);
      if (!daySchedule) {
        daySchedule = {
          date: dateStr,
          shifts: {
            'Halle': {},
            'Kasse': {},
            'Sauna': {},
            'Reinigung': {},
            'Gastro': {}
          }
        };
      }
      weekSchedule.push(daySchedule);
    }
    
    return weekSchedule;
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeekStart);
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate.toISOString().split('T')[0]);
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-buttons">
          <button
            className={`nav-btn ${viewMode === 'admin' ? 'active' : ''}`}
            onClick={() => switchView('admin')}
          >
            👨‍💼 Admin
          </button>
          <button
            className={`nav-btn ${viewMode === 'employee' ? 'active' : ''}`}
            onClick={() => switchView('employee')}
          >
            👤 Mitarbeiter
          </button>
        </div>
        
        {viewMode === 'employee' && (
          <div className="employee-selector">
            <select
              value={currentEmployeeId}
              onChange={(e) => setCurrentEmployeeId(e.target.value)}
              className="employee-dropdown"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </nav>

      <main className="main-content">
        {viewMode === 'admin' ? (
          <AdminView
            schedule={schedule}
            weekSchedule={getCurrentWeekSchedule()}
            employees={employees}
            currentWeekStart={currentWeekStart}
            onScheduleUpdate={handleScheduleUpdate}
            onEmployeesUpdate={handleEmployeesUpdate}
            onWeekChange={changeWeek}
          />
        ) : (
          <EmployeeView
            schedule={schedule}
            weekSchedule={getCurrentWeekSchedule()}
            employees={employees}
            currentEmployeeId={currentEmployeeId}
            currentWeekStart={currentWeekStart}
            onWeekChange={changeWeek}
          />
        )}
      </main>
    </div>
  );
}

export default App;

