import { useState, useEffect } from 'react';
import { AdminView } from './components/AdminView';
import { EmployeeView } from './components/EmployeeView';
import { DaySchedule, Employee, VacationRequest, Notification, VacationRequestType } from './types';
import './App.css';

type ViewMode = 'admin' | 'employee';

const STORAGE_KEY_SCHEDULE = 'schichtplan_schedule';
const STORAGE_KEY_EMPLOYEES = 'schichtplan_employees';
const STORAGE_KEY_VIEW = 'schichtplan_view';
const STORAGE_KEY_CURRENT_EMPLOYEE = 'schichtplan_current_employee';
const STORAGE_KEY_CURRENT_WEEK = 'schichtplan_current_week';
const STORAGE_KEY_VACATION_REQUESTS = 'schichtplan_vacation_requests';
const STORAGE_KEY_NOTIFICATIONS = 'schichtplan_notifications';

// Helper function to get Monday of a given week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
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

const getInitialVacationRequests = (): VacationRequest[] => {
  const saved = localStorage.getItem(STORAGE_KEY_VACATION_REQUESTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing vacation requests:', e);
      localStorage.removeItem(STORAGE_KEY_VACATION_REQUESTS);
    }
  }
  return [];
};

const getInitialNotifications = (): Notification[] => {
  const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing notifications:', e);
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    }
  }
  return [];
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
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>(getInitialVacationRequests);
  const [notifications, setNotifications] = useState<Notification[]>(getInitialNotifications);

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VACATION_REQUESTS, JSON.stringify(vacationRequests));
  }, [vacationRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  const handleScheduleUpdate = (newSchedule: DaySchedule[]) => {
    setSchedule(newSchedule);
  };

  const handleEmployeesUpdate = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
  };

  const handleVacationRequest = (employeeId: string, startDate: string, endDate: string, type: VacationRequestType) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const request: VacationRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      startDate,
      endDate,
      type,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    setVacationRequests(prev => [...prev, request]);

    // Update schedule to show requested vacation/overhours for all days in range
    const updatedSchedule = [...schedule];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      let daySchedule = updatedSchedule.find(s => s.date === dateStr);
      
      if (!daySchedule) {
        daySchedule = {
          date: dateStr,
          shifts: {
            'Halle': {},
            'Kasse': {},
            'Sauna': {},
            'Reinigung': {},
            'Gastro': {}
          },
          specialStatus: {}
        };
        updatedSchedule.push(daySchedule);
      }
      
      if (!daySchedule.specialStatus) {
        daySchedule.specialStatus = {};
      }
      
      // Set status based on type
      if (type === 'Urlaub') {
        daySchedule.specialStatus[employeeId] = 'Urlaub_beantragt';
      } else {
        daySchedule.specialStatus[employeeId] = 'Überstunden_beantragt';
      }
    }
    
    setSchedule(updatedSchedule);
  };

  const handleVacationDecision = (requestId: string, approved: boolean, reviewedBy: string = 'Admin') => {
    const request = vacationRequests.find(r => r.id === requestId);
    if (!request) return;

    const updatedRequests: VacationRequest[] = vacationRequests.map(r => 
      r.id === requestId 
        ? { ...r, status: approved ? 'approved' as const : 'rejected' as const, reviewedAt: new Date().toISOString(), reviewedBy }
        : r
    );
    setVacationRequests(updatedRequests);

    // Update schedule for all days in range
    const updatedSchedule = [...schedule];
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      let daySchedule = updatedSchedule.find(s => s.date === dateStr);
      
      if (daySchedule && daySchedule.specialStatus) {
        if (approved) {
          if (request.type === 'Urlaub') {
            daySchedule.specialStatus[request.employeeId] = 'Urlaub_genehmigt';
          } else {
            daySchedule.specialStatus[request.employeeId] = 'Überstunden_genehmigt';
          }
        } else {
          if (request.type === 'Urlaub') {
            daySchedule.specialStatus[request.employeeId] = 'Urlaub_abgelehnt';
          } else {
            daySchedule.specialStatus[request.employeeId] = 'Überstunden_abgelehnt';
          }
        }
      }
    }
    
    setSchedule(updatedSchedule);

    // Create notification
    const dateRange = `${new Date(request.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${new Date(request.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: request.employeeId,
      type: approved ? 'vacation_approved' : 'vacation_rejected',
      message: approved 
        ? `Ihr ${request.type === 'Urlaub' ? 'Urlaubs' : 'Überstunden'}antrag für ${dateRange} wurde genehmigt.`
        : `Ihr ${request.type === 'Urlaub' ? 'Urlaubs' : 'Überstunden'}antrag für ${dateRange} wurde abgelehnt.`,
      date: request.startDate,
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
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
                  {emp.firstName} {emp.lastName}
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
            vacationRequests={vacationRequests}
            onVacationDecision={handleVacationDecision}
          />
        ) : (
          <EmployeeView
            schedule={schedule}
            weekSchedule={getCurrentWeekSchedule()}
            employees={employees}
            currentEmployeeId={currentEmployeeId}
            currentWeekStart={currentWeekStart}
            onWeekChange={changeWeek}
            onVacationRequest={handleVacationRequest}
            notifications={notifications.filter(n => n.employeeId === currentEmployeeId)}
            onMarkNotificationRead={markNotificationAsRead}
          />
        )}
      </main>
    </div>
  );
}

export default App;

