import React, { useState } from 'react';
import { ShiftType, AreaType, DaySchedule, Employee, SpecialStatus, EmployeeColor } from '../types';

interface AdminViewProps {
  schedule: DaySchedule[];
  weekSchedule: DaySchedule[];
  employees: Employee[];
  currentWeekStart: string;
  onScheduleUpdate: (schedule: DaySchedule[]) => void;
  onEmployeesUpdate: (employees: Employee[]) => void;
  onWeekChange: (direction: 'prev' | 'next') => void;
}

const SHIFT_TYPES: ShiftType[] = ['Frühschicht', 'Mittelschicht', 'Spätschicht'];
const AREAS: AreaType[] = ['Halle', 'Kasse', 'Sauna', 'Reinigung', 'Gastro'];
const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

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

export const AdminView: React.FC<AdminViewProps> = ({ 
  schedule, 
  weekSchedule,
  employees, 
  currentWeekStart,
  onScheduleUpdate,
  onEmployeesUpdate,
  onWeekChange 
}) => {
  const [newEmployeeFirstName, setNewEmployeeFirstName] = useState('');
  const [newEmployeeLastName, setNewEmployeeLastName] = useState('');
  const [newEmployeePhone, setNewEmployeePhone] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeWeeklyHours, setNewEmployeeWeeklyHours] = useState<string>('');
  const [newEmployeeAreas, setNewEmployeeAreas] = useState<AreaType[]>([]);
  const [newEmployeeColor, setNewEmployeeColor] = useState<EmployeeColor | undefined>(undefined);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'area' | 'employee'>('area');
  const [employeeViewMode, setEmployeeViewMode] = useState<'week' | 'month'>('week');
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Bulk assignment state
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkStartDate, setBulkStartDate] = useState<string>(currentWeekStart);
  const [bulkEndDate, setBulkEndDate] = useState<string>(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  });
  const [bulkShift, setBulkShift] = useState<ShiftType>('Frühschicht');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mo-Fr default
  
  // Drag and Drop state
  const [draggedEmployee, setDraggedEmployee] = useState<{
    employeeId: string;
    employeeName: string;
    sourceDate: string;
    sourceArea: AreaType;
    sourceShift: ShiftType;
  } | null>(null);

  // Drag state for employee view
  const [draggedShiftType, setDraggedShiftType] = useState<ShiftType | SpecialStatus | null>(null);
  const [hoveredDropCell, setHoveredDropCell] = useState<{employeeId: string, dateStr: string} | null>(null);
  const [draggedShiftFromCell, setDraggedShiftFromCell] = useState<{employeeId: string, dateStr: string, shiftType: ShiftType | SpecialStatus} | null>(null);
  
  // Multi-day assignment state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastSelectedCell, setLastSelectedCell] = useState<{ employeeId: string; dateStr: string } | null>(null);
  
  // Week copy dialog state
  const [showWeekCopyDialog, setShowWeekCopyDialog] = useState(false);
  const [copySourceWeek, setCopySourceWeek] = useState<string>(currentWeekStart);
  const [copyTargetWeek, setCopyTargetWeek] = useState<string>(() => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [copySourceMonth, setCopySourceMonth] = useState<string>(() => {
    const now = new Date(currentWeekStart);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [copyTargetMonth, setCopyTargetMonth] = useState<string>(() => {
    const nextMonth = new Date(currentWeekStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  const toggleAreaSelection = (area: AreaType) => {
    setNewEmployeeAreas(prev => {
      if (prev.includes(area)) {
        return prev.filter(a => a !== area);
      } else if (prev.length < 4) {
        return [...prev, area];
      } else {
        setValidationMessage('⚠️ Ein Mitarbeiter kann maximal 4 Bereiche haben!');
        setTimeout(() => setValidationMessage(null), 3000);
        return prev;
      }
    });
  };

  const addEmployee = () => {
    if (!newEmployeeFirstName.trim() || !newEmployeeLastName.trim()) {
      setValidationMessage('⚠️ Bitte geben Sie Vor- und Nachname ein!');
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }

    if (newEmployeeAreas.length === 0) {
      setValidationMessage('⚠️ Bitte wählen Sie mindestens einen Bereich aus!');
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }
    
    const newEmployee: Employee = {
      id: Date.now().toString(),
      firstName: newEmployeeFirstName.trim(),
      lastName: newEmployeeLastName.trim(),
      areas: [...newEmployeeAreas],
      phone: newEmployeePhone.trim() || undefined,
      email: newEmployeeEmail.trim() || undefined,
      weeklyHours: newEmployeeWeeklyHours ? parseFloat(newEmployeeWeeklyHours) : undefined,
      color: newEmployeeColor
    };
    
    const updatedEmployees = [...employees, newEmployee];
    onEmployeesUpdate(updatedEmployees);
    
    setNewEmployeeFirstName('');
    setNewEmployeeLastName('');
    setNewEmployeePhone('');
    setNewEmployeeEmail('');
    setNewEmployeeWeeklyHours('');
    setNewEmployeeAreas([]);
    setNewEmployeeColor(undefined);
    setShowEmployeeForm(false);
    setValidationMessage(`✅ ${newEmployee.firstName} ${newEmployee.lastName} wurde hinzugefügt (${newEmployee.areas.join(', ')})!`);
    setTimeout(() => setValidationMessage(null), 3000);
  };

  // Check if an employee is already assigned to any shift on a given date
  const isEmployeeAssignedOnDate = (dateStr: string, employeeId: string, excludeArea?: AreaType, excludeShift?: ShiftType): boolean => {
    const daySchedule = schedule.find(s => s.date === dateStr);
    if (!daySchedule) return false;

    for (const area of AREAS) {
      for (const shift of SHIFT_TYPES) {
        // Skip the current area/shift combination if specified
        if (area === excludeArea && shift === excludeShift) continue;
        
        const assignments = daySchedule.shifts[area]?.[shift];
        if (assignments?.some(a => a.employeeId === employeeId)) {
          return true;
        }
      }
    }
    return false;
  };

  // Get the shift where an employee is assigned on a given date
  const getEmployeeAssignment = (dateStr: string, employeeId: string): { area: AreaType; shift: ShiftType } | null => {
    const daySchedule = schedule.find(s => s.date === dateStr);
    if (!daySchedule) return null;

    for (const area of AREAS) {
      for (const shift of SHIFT_TYPES) {
        const assignments = daySchedule.shifts[area]?.[shift];
        if (assignments?.some(a => a.employeeId === employeeId)) {
          return { area, shift };
        }
      }
    }
    return null;
  };

  const assignEmployee = (dateStr: string, area: AreaType, shift: ShiftType, employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    // Check if employee is assigned to this area
    if (!employee.areas.includes(area)) {
      setValidationMessage(
        `⚠️ ${employee.firstName} ${employee.lastName} ist nicht dem Bereich "${area}" zugewiesen! (Bereiche: ${employee.areas.join(', ')})`
      );
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }

    // Check if employee is already assigned to another shift on this date
    if (isEmployeeAssignedOnDate(dateStr, employeeId, area, shift)) {
      const existingAssignment = getEmployeeAssignment(dateStr, employeeId);
      if (existingAssignment) {
        setValidationMessage(
          `⚠️ ${employee.firstName} ${employee.lastName} ist bereits am ${new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} in der ${existingAssignment.shift} (${existingAssignment.area}) eingeteilt!`
        );
        setTimeout(() => setValidationMessage(null), 5000);
      }
      return;
    }

    const updatedSchedule = [...schedule];
    let daySchedule = updatedSchedule.find(s => s.date === dateStr);

    if (!daySchedule) {
      daySchedule = {
        date: dateStr,
        shifts: Object.fromEntries(AREAS.map(a => [a, {}])) as any
      };
      updatedSchedule.push(daySchedule);
    }

    if (!daySchedule.shifts[area]) {
      daySchedule.shifts[area] = {};
    }

    if (!daySchedule.shifts[area][shift]) {
      daySchedule.shifts[area][shift] = [];
    }

    const assignments = daySchedule.shifts[area][shift]!;
    const existingIndex = assignments.findIndex(a => a.employeeId === employeeId);

    if (existingIndex === -1) {
      assignments.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`
      });
      setValidationMessage(`✅ ${employee.firstName} ${employee.lastName} wurde erfolgreich zugewiesen!`);
      setTimeout(() => setValidationMessage(null), 3000);
    }

    onScheduleUpdate(updatedSchedule);
  };

  const removeAssignment = (dateStr: string, area: AreaType, shift: ShiftType, employeeId: string) => {
    const updatedSchedule = [...schedule];
    const daySchedule = updatedSchedule.find(s => s.date === dateStr);

    if (daySchedule?.shifts[area]?.[shift]) {
      daySchedule.shifts[area][shift] = daySchedule.shifts[area][shift]!.filter(
        a => a.employeeId !== employeeId
      );
    }

    onScheduleUpdate(updatedSchedule);
  };

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

  // Assign shift or special status to employee in employee view
  const assignShiftToEmployee = (employeeId: string, dateStr: string, shiftType: ShiftType | SpecialStatus) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const updatedSchedule = [...schedule];
    let daySchedule = updatedSchedule.find(s => s.date === dateStr);

    if (!daySchedule) {
      daySchedule = {
        date: dateStr,
        shifts: Object.fromEntries(AREAS.map(a => [a, {}])) as any,
        specialStatus: {}
      };
      updatedSchedule.push(daySchedule);
    }

    // Initialize specialStatus if it doesn't exist
    if (!daySchedule.specialStatus) {
      daySchedule.specialStatus = {};
    }

    // If assigning Urlaub or Krank, remove all regular shifts and set special status
    if (shiftType === 'Urlaub' || shiftType === 'Krank') {
      // Remove employee from all regular shifts on this date
      AREAS.forEach(area => {
        SHIFT_TYPES.forEach(shift => {
          if (daySchedule.shifts[area]?.[shift]) {
            daySchedule.shifts[area][shift] = daySchedule.shifts[area][shift]!.filter(
              a => a.employeeId !== employeeId
            );
          }
        });
      });
      // Set special status
      daySchedule.specialStatus[employeeId] = shiftType;
    } else {
      // Remove special status if assigning regular shift
      delete daySchedule.specialStatus[employeeId];

      // Remove employee from all other shifts on this date
      AREAS.forEach(area => {
        SHIFT_TYPES.forEach(shift => {
          if (daySchedule.shifts[area]?.[shift]) {
            daySchedule.shifts[area][shift] = daySchedule.shifts[area][shift]!.filter(
              a => a.employeeId !== employeeId
            );
          }
        });
      });

      // Assign to first available area that employee can work in
      const availableArea = employee.areas.find(area => employee.areas.includes(area));
      if (availableArea) {
        if (!daySchedule.shifts[availableArea]) {
          daySchedule.shifts[availableArea] = {};
        }
        if (!daySchedule.shifts[availableArea][shiftType]) {
          daySchedule.shifts[availableArea][shiftType] = [];
        }
        const assignments = daySchedule.shifts[availableArea][shiftType]!;
        const existingIndex = assignments.findIndex(a => a.employeeId === employeeId);
        if (existingIndex === -1) {
          assignments.push({
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`
          });
        }
      }
    }

    onScheduleUpdate(updatedSchedule);
  };


  // Copy entire week schedule
  const copyWeekSchedule = (sourceWeekStart: string, targetWeekStart: string) => {
    const sourceStart = new Date(sourceWeekStart);
    const targetStart = new Date(targetWeekStart);
    
    const updatedSchedule = [...schedule];
    
    // Copy each day of the week
    for (let i = 0; i < 7; i++) {
      const sourceDate = new Date(sourceStart);
      sourceDate.setDate(sourceStart.getDate() + i);
      const sourceDateStr = sourceDate.toISOString().split('T')[0];
      
      const targetDate = new Date(targetStart);
      targetDate.setDate(targetStart.getDate() + i);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // Find source day schedule
      const sourceDaySchedule = schedule.find(s => s.date === sourceDateStr);
      if (!sourceDaySchedule) continue;
      
      // Find or create target day schedule
      let targetDaySchedule = updatedSchedule.find(s => s.date === targetDateStr);
      if (!targetDaySchedule) {
        targetDaySchedule = {
          date: targetDateStr,
          shifts: Object.fromEntries(AREAS.map(a => [a, {}])) as any,
          specialStatus: {}
        };
        updatedSchedule.push(targetDaySchedule);
      }
      
      // Copy all shifts
      AREAS.forEach(area => {
        SHIFT_TYPES.forEach(shift => {
          const sourceAssignments = sourceDaySchedule.shifts[area]?.[shift];
          if (sourceAssignments && sourceAssignments.length > 0) {
            if (!targetDaySchedule.shifts[area]) {
              targetDaySchedule.shifts[area] = {};
            }
            if (!targetDaySchedule.shifts[area][shift]) {
              targetDaySchedule.shifts[area][shift] = [];
            }
            // Copy assignments (create new array to avoid reference issues)
            targetDaySchedule.shifts[area][shift] = sourceAssignments.map(a => ({ ...a }));
          }
        });
      });
      
      // Copy special status
      if (sourceDaySchedule.specialStatus) {
        if (!targetDaySchedule.specialStatus) {
          targetDaySchedule.specialStatus = {};
        }
        Object.keys(sourceDaySchedule.specialStatus).forEach(employeeId => {
          targetDaySchedule.specialStatus![employeeId] = sourceDaySchedule.specialStatus![employeeId];
        });
      }
    }
    
    onScheduleUpdate(updatedSchedule);
    setValidationMessage(`✅ Woche vom ${new Date(sourceWeekStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} wurde nach ${new Date(targetWeekStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} kopiert!`);
    setTimeout(() => setValidationMessage(null), 5000);
  };

  // Remove shift or special status from employee
  const removeShiftFromEmployee = (employeeId: string, dateStr: string) => {
    const updatedSchedule = [...schedule];
    const daySchedule = updatedSchedule.find(s => s.date === dateStr);

    if (!daySchedule) return;

    // Remove from special status
    if (daySchedule.specialStatus) {
      delete daySchedule.specialStatus[employeeId];
    }

    // Remove from all regular shifts
    AREAS.forEach(area => {
      SHIFT_TYPES.forEach(shift => {
        if (daySchedule.shifts[area]?.[shift]) {
          daySchedule.shifts[area][shift] = daySchedule.shifts[area][shift]!.filter(
            a => a.employeeId !== employeeId
          );
        }
      });
    });

    onScheduleUpdate(updatedSchedule);
  };

  // Get all dates in a month
  const getMonthDates = (yearMonth: string): string[] => {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0);
    const dates: string[] = [];
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // Change month navigation
  const changeMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  // Get month range display
  const getMonthRange = (): string => {
    const [year, month] = currentMonth.split('-').map(Number);
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                       'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${monthNames[month - 1]} ${year}`;
  };

  // Get day name for a date
  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return dayNames[date.getDay()];
  };

  // Convert shift abbreviation to ShiftType or SpecialStatus
  const getShiftTypeFromAbbreviation = (abbrev: string): ShiftType | SpecialStatus | null => {
    if (abbrev === 'F') return 'Frühschicht';
    if (abbrev === 'M') return 'Mittelschicht';
    if (abbrev === 'S') return 'Spätschicht';
    if (abbrev === 'U') return 'Urlaub';
    if (abbrev === 'K') return 'Krank';
    return null;
  };

  // Get Monday of a week from any date in that week
  const getMondayOfWeek = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Get week range display for a week start date
  const getWeekRangeForDate = (weekStart: string): string => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  const getCellKey = (employeeId: string, dateStr: string) => `${employeeId}|${dateStr}`;

  const getDateRange = (startDateStr: string, endDateStr: string): string[] => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const range: string[] = [];
    const step = startDate <= endDate ? 1 : -1;

    for (let date = new Date(startDate); step === 1 ? date <= endDate : date >= endDate; date.setDate(date.getDate() + step)) {
      range.push(date.toISOString().split('T')[0]);
    }

    return range;
  };

  const getSelectedDatesForEmployee = (employeeId: string): string[] => {
    return Array.from(selectedCells)
      .filter(key => key.startsWith(`${employeeId}|`))
      .map(key => key.split('|')[1]);
  };

  const multiSelectTooltip = "Klick: Feld wählen/entfernen | Strg/Cmd optional | Shift+Klick (gleicher Mitarbeiter): Bereich";

  // Get all dates for a month calendar
  const getMonthDatesForCalendar = (yearMonth: string): Array<{ date: string; day: number; isCurrentMonth: boolean }> => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    // Convert to Monday = 0 format
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const dates: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
    
    // Add days from previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(prevYear, prevMonth - 1, day);
      dates.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false
      });
    }
    
    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      dates.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: true
      });
    }
    
    // Add days from next month to fill the week
    const totalCells = dates.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const date = new Date(nextYear, nextMonth - 1, day);
      dates.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false
      });
    }
    
    return dates;
  };

  // Get week dates for calendar
  const getWeekDatesForCalendar = (weekStart: string): Array<{ date: string; day: number; dayName: string }> => {
    const start = new Date(weekStart);
    const dates: Array<{ date: string; day: number; dayName: string }> = [];
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        dayName: dayNames[i]
      });
    }
    
    return dates;
  };

  // Change month in calendar
  const changeCopyMonth = (direction: 'prev' | 'next', type: 'source' | 'target') => {
    const currentMonth = type === 'source' ? copySourceMonth : copyTargetMonth;
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (type === 'source') {
      setCopySourceMonth(newMonth);
    } else {
      setCopyTargetMonth(newMonth);
    }
  };

  // Change week in calendar
  const changeCopyWeek = (direction: 'prev' | 'next', type: 'source' | 'target') => {
    const currentWeek = type === 'source' ? copySourceWeek : copyTargetWeek;
    const date = new Date(currentWeek);
    
    if (direction === 'prev') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setDate(date.getDate() + 7);
    }
    
    const newWeek = date.toISOString().split('T')[0];
    
    if (type === 'source') {
      setCopySourceWeek(newWeek);
      // Update month to match
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setCopySourceMonth(month);
    } else {
      setCopyTargetWeek(newWeek);
      // Update month to match
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setCopyTargetMonth(month);
    }
  };

  // Handle week copy with dialog
  const handleWeekCopy = () => {
    const sourceMonday = getMondayOfWeek(copySourceWeek);
    const targetMonday = getMondayOfWeek(copyTargetWeek);
    
    if (sourceMonday === targetMonday) {
      setValidationMessage('⚠️ Quell- und Zielwoche dürfen nicht identisch sein!');
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }
    
    copyWeekSchedule(sourceMonday, targetMonday);
    setShowWeekCopyDialog(false);
  };

  // Get shifts for an employee on a specific date
  const getEmployeeShiftsForDate = (employeeId: string, dateStr: string): string[] => {
    // Use full schedule instead of weekSchedule to support month view
    const daySchedule = schedule.find(s => s.date === dateStr);
    if (!daySchedule) return [];

    const shifts: string[] = [];

    // Check for special status (Urlaub/Krank) first
    if (daySchedule.specialStatus?.[employeeId]) {
      const status = daySchedule.specialStatus[employeeId];
      if (status === 'Urlaub') shifts.push('U');
      else if (status === 'Krank') shifts.push('K');
      return shifts; // If special status, don't show regular shifts
    }
    
    AREAS.forEach(area => {
      SHIFT_TYPES.forEach(shift => {
        const assignments = daySchedule.shifts[area]?.[shift];
        if (assignments?.some(a => a.employeeId === employeeId)) {
          // F for Frühschicht, M for Mittelschicht, S for Spätschicht
          if (shift === 'Frühschicht') shifts.push('F');
          else if (shift === 'Mittelschicht') shifts.push('M');
          else if (shift === 'Spätschicht') shifts.push('S');
        }
      });
    });

    return shifts;
  };

  // Calculate worked hours for an employee in the current week
  const calculateWeeklyHours = (employeeId: string): number => {
    let totalHours = 0;
    const HOURS_PER_SHIFT = 8;

    weekSchedule.forEach(day => {
      AREAS.forEach(area => {
        SHIFT_TYPES.forEach(shift => {
          const assignments = day.shifts[area]?.[shift];
          if (assignments?.some(a => a.employeeId === employeeId)) {
            totalHours += HOURS_PER_SHIFT;
          }
        });
      });
    });

    return totalHours;
  };

  // Determine if employee has met their weekly hours requirement
  const getHoursStatus = (employeeId: string, targetHours?: number): 'fulfilled' | 'under' | 'over' | 'no-target' => {
    if (!targetHours) return 'no-target';
    
    const workedHours = calculateWeeklyHours(employeeId);
    
    if (workedHours >= targetHours) return 'fulfilled';
    if (workedHours < targetHours) return 'under';
    return 'no-target';
  };

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    employeeId: string,
    employeeName: string,
    date: string,
    area: AreaType,
    shift: ShiftType
  ) => {
    setDraggedEmployee({
      employeeId,
      employeeName,
      sourceDate: date,
      sourceArea: area,
      sourceShift: shift
    });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', employeeId);
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedEmployee(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (
    e: React.DragEvent,
    targetDate: string,
    targetArea: AreaType,
    targetShift: ShiftType
  ) => {
    e.preventDefault();
    
    if (!draggedEmployee) return;

    const { employeeId, employeeName } = draggedEmployee;
    const employee = employees.find(emp => emp.id === employeeId);
    
    if (!employee) return;

    // Check if employee is assigned to target area
    if (!employee.areas.includes(targetArea)) {
      setValidationMessage(
        `⚠️ ${employee.firstName} ${employee.lastName} ist nicht dem Bereich "${targetArea}" zugewiesen!`
      );
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }

    // Check if employee is already assigned on target date
    if (isEmployeeAssignedOnDate(targetDate, employeeId)) {
      setValidationMessage(
        `⚠️ ${employee.firstName} ${employee.lastName} ist bereits am ${new Date(targetDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} eingeteilt!`
      );
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }

    // Copy employee to target
    const updatedSchedule = [...schedule];
    let daySchedule = updatedSchedule.find(s => s.date === targetDate);

    if (!daySchedule) {
      daySchedule = {
        date: targetDate,
        shifts: Object.fromEntries(AREAS.map(a => [a, {}])) as any
      };
      updatedSchedule.push(daySchedule);
    }

    if (!daySchedule.shifts[targetArea]) {
      daySchedule.shifts[targetArea] = {};
    }

    if (!daySchedule.shifts[targetArea][targetShift]) {
      daySchedule.shifts[targetArea][targetShift] = [];
    }

    const assignments = daySchedule.shifts[targetArea][targetShift]!;
    const existingIndex = assignments.findIndex(a => a.employeeId === employeeId);

    if (existingIndex === -1) {
      assignments.push({
        employeeId,
        employeeName
      });
      
      setValidationMessage(
        `✅ ${employee.firstName} ${employee.lastName} wurde nach ${new Date(targetDate).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} kopiert!`
      );
      setTimeout(() => setValidationMessage(null), 3000);
    }

    onScheduleUpdate(updatedSchedule);
    setDraggedEmployee(null);
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Drag & Drop handlers for employee view (from palette)
  const handleEmployeeViewDragStart = (e: React.DragEvent, shiftType: ShiftType | SpecialStatus) => {
    setDraggedShiftType(shiftType);
    setDraggedShiftFromCell(null); // Clear shift-from-cell when dragging from palette
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', shiftType);
    
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleEmployeeViewDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedShiftType(null);
    setDraggedShiftFromCell(null);
    setHoveredDropCell(null);
  };

  // Drag handler for shifts from table cells
  const handleShiftDragStart = (e: React.DragEvent, employeeId: string, dateStr: string, shiftType: ShiftType | SpecialStatus) => {
    setDraggedShiftFromCell({ employeeId, dateStr, shiftType });
    setDraggedShiftType(shiftType);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `shift:${employeeId}:${dateStr}:${shiftType}`);
    
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleShiftDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    // Don't clear state here - let the drop handler clear it on success
    // If drop didn't happen, state will be cleared on next drag or component update
    // Use a small delay to ensure drop handler runs first
    setTimeout(() => {
      if (draggedShiftFromCell) {
        setDraggedShiftType(null);
        setDraggedShiftFromCell(null);
        setHoveredDropCell(null);
      }
    }, 100);
  };

  const applyShiftToSelection = (shiftType: ShiftType | SpecialStatus) => {
    if (selectedCells.size === 0) return;

    const grouped = new Map<string, string[]>();
    selectedCells.forEach(key => {
      const [employeeId, dateStr] = key.split('|');
      if (!grouped.has(employeeId)) grouped.set(employeeId, []);
      grouped.get(employeeId)!.push(dateStr);
    });

    grouped.forEach((dates, employeeId) => {
      dates.forEach(dateStr => {
        assignShiftToEmployee(employeeId, dateStr, shiftType);
      });
    });

    setValidationMessage(`✅ ${shiftType} wurde ${selectedCells.size} Feld(er) zugewiesen!`);
    setTimeout(() => setValidationMessage(null), 3000);

    setSelectedCells(new Set());
    setLastSelectedCell(null);
  };

  const handlePaletteClick = (shiftType: ShiftType | SpecialStatus) => {
    if (selectedCells.size > 0) {
      applyShiftToSelection(shiftType);
    }
  };

  const handleEmployeeViewDragOver = (e: React.DragEvent, employeeId: string, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setHoveredDropCell({ employeeId, dateStr });
  };

  const handleEmployeeViewDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the cell (not just moving to a child element)
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!target.contains(relatedTarget)) {
      setHoveredDropCell(null);
    }
  };

  const handleEmployeeViewDrop = (e: React.DragEvent, employeeId: string, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Important: Save current drag state before clearing it
    const currentDraggedShiftFromCell = draggedShiftFromCell;
    const currentDraggedShiftType = draggedShiftType;
    
    // Check if we have either a shift type from palette or from table cell
    if (!currentDraggedShiftType && !currentDraggedShiftFromCell) {
      return;
    }

    // Determine selected dates for the current employee
    const selectedDatesForEmployee = getSelectedDatesForEmployee(employeeId);

    // Clear drag state immediately to prevent handleShiftDragEnd from interfering
    setDraggedShiftType(null);
    setDraggedShiftFromCell(null);
    setHoveredDropCell(null);

    // If dragging a shift from a table cell (copying)
    if (currentDraggedShiftFromCell) {
      const { employeeId: sourceEmployeeId, dateStr: sourceDateStr, shiftType } = currentDraggedShiftFromCell;
      
      // Don't copy to the same cell
      if (sourceEmployeeId === employeeId && sourceDateStr === dateStr) {
        return;
      }
      
      // If multi-day mode is active and days are selected, copy to all selected days
      if (selectedDatesForEmployee.length > 0) {
        const daysToAssign = selectedDatesForEmployee.filter(dayDate => 
          !(sourceEmployeeId === employeeId && dayDate === sourceDateStr)
        );
        
        if (daysToAssign.length === 0) {
          return;
        }
        
        daysToAssign.forEach(dayDate => {
          assignShiftToEmployee(employeeId, dayDate, shiftType);
        });
        
        setValidationMessage(`✅ ${shiftType} wurde von ${new Date(sourceDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} auf ${daysToAssign.length} Tag(e) kopiert!`);
        setTimeout(() => setValidationMessage(null), 3000);
        
        setSelectedCells(new Set());
        setLastSelectedCell(null);
      } else {
        // Copy to single day
        assignShiftToEmployee(employeeId, dateStr, shiftType);
        setValidationMessage(`✅ ${shiftType} wurde von ${new Date(sourceDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} nach ${new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} kopiert!`);
        setTimeout(() => setValidationMessage(null), 3000);
      }
    } else {
      // Dragging from palette (new assignment)
      // If multi-day mode is active and days are selected, assign to all selected days
      if (selectedDatesForEmployee.length > 0) {
        const daysToAssign = selectedDatesForEmployee.includes(dateStr)
          ? selectedDatesForEmployee
          : [...selectedDatesForEmployee, dateStr];
        
        // Assign to all selected days for this employee
        if (currentDraggedShiftType) {
          daysToAssign.forEach(dayDate => {
            assignShiftToEmployee(employeeId, dayDate, currentDraggedShiftType);
          });
          
          setValidationMessage(`✅ ${currentDraggedShiftType} wurde ${daysToAssign.length} Tag(en) zugewiesen!`);
          setTimeout(() => setValidationMessage(null), 3000);
        }
        
        setSelectedCells(new Set());
        setLastSelectedCell(null);
      } else {
        // Check if dropping on existing shift (remove it)
        if (currentDraggedShiftType) {
          const currentShifts = getEmployeeShiftsForDate(employeeId, dateStr);
          if (currentShifts.length > 0) {
            // If dropping same type, remove it; otherwise replace
            const shiftTypeStr = currentDraggedShiftType === 'Frühschicht' ? 'F' :
                                currentDraggedShiftType === 'Mittelschicht' ? 'M' :
                                currentDraggedShiftType === 'Spätschicht' ? 'S' :
                                currentDraggedShiftType === 'Urlaub' ? 'U' : 'K';
            
            if (currentShifts.includes(shiftTypeStr)) {
              removeShiftFromEmployee(employeeId, dateStr);
            } else {
              assignShiftToEmployee(employeeId, dateStr, currentDraggedShiftType);
            }
          } else {
            assignShiftToEmployee(employeeId, dateStr, currentDraggedShiftType);
          }
        }
      }
    }

    setDraggedShiftType(null);
    setDraggedShiftFromCell(null);
    setHoveredDropCell(null);
  };

  // Handle cell click for multi-day selection
  const handleCellClick = (e: React.MouseEvent, employeeId: string, dateStr: string) => {
    const key = getCellKey(employeeId, dateStr);

    if (e.shiftKey && lastSelectedCell && lastSelectedCell.employeeId === employeeId) {
      const rangeDates = getDateRange(lastSelectedCell.dateStr, dateStr);
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        rangeDates.forEach(rangeDate => newSet.add(getCellKey(employeeId, rangeDate)));
        return newSet;
      });
    } else {
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    }

    setLastSelectedCell({ employeeId, dateStr });
  };

  const bulkAssignEmployees = () => {
    if (selectedEmployees.length === 0) {
      setValidationMessage('⚠️ Bitte wählen Sie mindestens einen Mitarbeiter aus!');
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }

    if (selectedWeekdays.length === 0) {
      setValidationMessage('⚠️ Bitte wählen Sie mindestens einen Wochentag aus!');
      setTimeout(() => setValidationMessage(null), 3000);
      return;
    }

    const updatedSchedule = [...schedule];
    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    let assignmentCount = 0;
    let conflictCount = 0;

    // Iterate through all dates in range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday = 7
      
      // Check if this weekday is selected
      if (!selectedWeekdays.includes(adjustedDay)) continue;

      const dateStr = date.toISOString().split('T')[0];

      // Try to assign each selected employee to their areas
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) continue;

        // Check if employee is already assigned on this date
        if (isEmployeeAssignedOnDate(dateStr, employeeId)) {
          conflictCount++;
          continue;
        }

        // Assign to FIRST area of the employee (primary area)
        const primaryArea = employee.areas[0];

        // Find or create day schedule
        let daySchedule = updatedSchedule.find(s => s.date === dateStr);
        if (!daySchedule) {
          daySchedule = {
            date: dateStr,
            shifts: Object.fromEntries(AREAS.map(a => [a, {}])) as any
          };
          updatedSchedule.push(daySchedule);
        }

        // Ensure area and shift exist
        if (!daySchedule.shifts[primaryArea]) {
          daySchedule.shifts[primaryArea] = {};
        }
        if (!daySchedule.shifts[primaryArea][bulkShift]) {
          daySchedule.shifts[primaryArea][bulkShift] = [];
        }

        // Add assignment
        const assignments = daySchedule.shifts[primaryArea][bulkShift]!;
        const existingIndex = assignments.findIndex(a => a.employeeId === employeeId);
        
        if (existingIndex === -1) {
          assignments.push({
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`
          });
          assignmentCount++;
        }
      }
    }

    onScheduleUpdate(updatedSchedule);

    // Show result message
    let message = `✅ ${assignmentCount} Schicht(en) erfolgreich zugewiesen!`;
    if (conflictCount > 0) {
      message += ` ${conflictCount} Konflikt(e) übersprungen.`;
    }
    setValidationMessage(message);
    setTimeout(() => setValidationMessage(null), 5000);

    // Reset form
    setShowBulkAssignment(false);
    setSelectedEmployees([]);
    setSelectedWeekdays([1, 2, 3, 4, 5]);
  };

  return (
    <div className="admin-view">
      <div className="admin-header">
        <h1>👨‍💼 Admin Schichtplanung</h1>
        
        {validationMessage && (
          <div className={`validation-message ${validationMessage.startsWith('✅') ? 'success' : 'warning'}`}>
            {validationMessage}
          </div>
        )}
        
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

        <div className="view-mode-toggle">
          <button 
            onClick={() => setViewMode('area')} 
            className={`view-mode-btn ${viewMode === 'area' ? 'active' : ''}`}
          >
            📊 Bereichsansicht
          </button>
          <button 
            onClick={() => setViewMode('employee')} 
            className={`view-mode-btn ${viewMode === 'employee' ? 'active' : ''}`}
          >
            👥 Mitarbeiteransicht
          </button>
        </div>

        <div className="employee-section">
          <button 
            onClick={() => setShowEmployeeForm(!showEmployeeForm)} 
            className="btn-toggle-form"
          >
            {showEmployeeForm ? '✕ Abbrechen' : '+ Mitarbeiter'}
          </button>
          
          <button 
            onClick={() => setShowBulkAssignment(!showBulkAssignment)} 
            className="btn-bulk-assignment"
          >
            {showBulkAssignment ? '✕ Schließen' : '📅 Wochenplan erstellen'}
          </button>
          
          {showEmployeeForm && (
            <div className="employee-form-extended">
              <h4>Neuen Mitarbeiter hinzufügen</h4>
              
              <div className="form-section">
                <label>Persönliche Daten:</label>
                <div className="name-inputs">
                  <input
                    type="text"
                    value={newEmployeeFirstName}
                    onChange={(e) => setNewEmployeeFirstName(e.target.value)}
                    placeholder="Vorname *"
                    className="input-employee"
                    required
                  />
                  <input
                    type="text"
                    value={newEmployeeLastName}
                    onChange={(e) => setNewEmployeeLastName(e.target.value)}
                    placeholder="Nachname *"
                    className="input-employee"
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <label>Kontaktdaten:</label>
                <div className="contact-inputs">
                  <input
                    type="tel"
                    value={newEmployeePhone}
                    onChange={(e) => setNewEmployeePhone(e.target.value)}
                    placeholder="Telefonnummer"
                    className="input-employee"
                  />
                  <input
                    type="email"
                    value={newEmployeeEmail}
                    onChange={(e) => setNewEmployeeEmail(e.target.value)}
                    placeholder="E-Mail"
                    className="input-employee"
                  />
                  <input
                    type="number"
                    value={newEmployeeWeeklyHours}
                    onChange={(e) => setNewEmployeeWeeklyHours(e.target.value)}
                    placeholder="Wochenarbeitsstunden"
                    className="input-employee"
                    min="0"
                    max="60"
                    step="0.5"
                  />
                </div>
              </div>
              
              <div className="area-assignment">
                <label>Einsatzbereiche (max. 4) *:</label>
                <div className="area-selector">
                  {AREAS.map(area => (
                    <button
                      key={area}
                      onClick={() => toggleAreaSelection(area)}
                      className={`area-btn ${newEmployeeAreas.includes(area) ? 'selected' : ''}`}
                    >
                      {newEmployeeAreas.includes(area) && '✓ '}
                      {area}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="color-assignment">
                <label>Farbe:</label>
                <div className="color-selector">
                  {(['Rot', 'Braun', 'Schwarz', 'Grün', 'Violett'] as EmployeeColor[]).map(color => (
                    <button
                      key={color}
                      onClick={() => setNewEmployeeColor(newEmployeeColor === color ? undefined : color)}
                      className={`color-btn color-${color.toLowerCase()} ${newEmployeeColor === color ? 'selected' : ''}`}
                      title={color}
                    >
                      {newEmployeeColor === color && '✓ '}
                      <span className="color-preview" style={{ backgroundColor: getColorValue(color) }}></span>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
              
              <button onClick={addEmployee} className="btn-add-employee">Mitarbeiter hinzufügen</button>
            </div>
          )}
        </div>
      </div>

      {showBulkAssignment && (
        <div className="bulk-assignment-panel">
          <h3>📅 Wochenplan erstellen</h3>
          <p className="bulk-description">Weisen Sie mehreren Mitarbeitern gleichzeitig Schichten zu. Jeder Mitarbeiter wird automatisch seinem Hauptbereich zugewiesen.</p>
          
          <div className="bulk-section">
            <label>Zeitraum:</label>
            <div className="date-range">
              <input
                type="date"
                value={bulkStartDate}
                onChange={(e) => setBulkStartDate(e.target.value)}
                className="date-input"
              />
              <span>bis</span>
              <input
                type="date"
                value={bulkEndDate}
                onChange={(e) => setBulkEndDate(e.target.value)}
                className="date-input"
              />
            </div>
          </div>

          <div className="bulk-section">
            <label>Wochentage:</label>
            <div className="weekday-selector">
              {WEEKDAYS.map((day, index) => {
                const dayNum = index + 1;
                return (
                  <button
                    key={day}
                    onClick={() => toggleWeekday(dayNum)}
                    className={`weekday-btn ${selectedWeekdays.includes(dayNum) ? 'selected' : ''}`}
                  >
                    {day.substring(0, 2)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bulk-section">
            <label>Schicht:</label>
            <select
              value={bulkShift}
              onChange={(e) => setBulkShift(e.target.value as ShiftType)}
              className="bulk-select-single"
            >
              {SHIFT_TYPES.map(shift => (
                <option key={shift} value={shift}>{shift}</option>
              ))}
            </select>
          </div>

          <div className="bulk-section">
            <label>Mitarbeiter auswählen:</label>
            <div className="employee-multi-select">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => toggleEmployeeSelection(emp.id)}
                  className={`employee-select-btn ${selectedEmployees.includes(emp.id) ? 'selected' : ''}`}
                >
                  <div className="employee-btn-content">
                    <span className="employee-name">
                      {selectedEmployees.includes(emp.id) && '✓ '}
                      {emp.firstName} {emp.lastName}
                    </span>
                    <span className="employee-areas">{emp.areas.join(', ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bulk-actions">
            <button onClick={bulkAssignEmployees} className="btn-bulk-submit">
              ✓ Zuweisung durchführen
            </button>
            <button onClick={() => setShowBulkAssignment(false)} className="btn-bulk-cancel">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {viewMode === 'employee' ? (
        <div className="employee-overview-container">
          <h2 className="employee-overview-title">Mitarbeiter-Übersicht</h2>
          
          <div className="time-view-toggle">
            <button 
              onClick={() => setEmployeeViewMode('week')} 
              className={`time-view-btn ${employeeViewMode === 'week' ? 'active' : ''}`}
            >
              📅 Wochenansicht
            </button>
            <button 
              onClick={() => setEmployeeViewMode('month')} 
              className={`time-view-btn ${employeeViewMode === 'month' ? 'active' : ''}`}
            >
              📆 Monatsansicht
            </button>
          </div>

          {employeeViewMode === 'week' ? (
            <>
              <div className="week-navigation-employee">
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
            </>
          ) : (
            <div className="month-navigation">
              <button onClick={() => changeMonth('prev')} className="btn-month-nav">
                ← Vorheriger Monat
              </button>
              <div className="month-display">
                <strong>Monat:</strong> {getMonthRange()}
              </div>
              <button onClick={() => changeMonth('next')} className="btn-month-nav">
                Nächster Monat →
              </button>
            </div>
          )}
          
          <div className="employee-view-controls">
            <div className="selection-hint">
              Mehrfachauswahl ist immer aktiv: Klick markiert oder entfernt ein Feld, Shift+Klick (gleicher Mitarbeiter) markiert einen Bereich, Strg/Cmd ist optional.
            </div>
            
            <div className="control-group">
              <button
                onClick={() => {
                  setCopySourceWeek(currentWeekStart);
                  const nextWeekStart = new Date(currentWeekStart);
                  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
                  setCopyTargetWeek(nextWeekStart.toISOString().split('T')[0]);
                  // Initialize months based on current week selections
                  const sourceMonth = `${new Date(currentWeekStart).getFullYear()}-${String(new Date(currentWeekStart).getMonth() + 1).padStart(2, '0')}`;
                  const targetMonth = `${nextWeekStart.getFullYear()}-${String(nextWeekStart.getMonth() + 1).padStart(2, '0')}`;
                  setCopySourceMonth(sourceMonth);
                  setCopyTargetMonth(targetMonth);
                  setShowWeekCopyDialog(true);
                }}
                className="btn-copy-week"
                title="Woche kopieren - Quell- und Zielwoche auswählen"
              >
                📋 Woche kopieren
              </button>
            </div>
            
            {selectedCells.size > 0 && (
              <div className="selection-info">
                {selectedCells.size} Feld(er) ausgewählt
                <button
                  onClick={() => {
                    setSelectedCells(new Set());
                    setLastSelectedCell(null);
                  }}
                  className="btn-clear-selection"
                >
                  Auswahl löschen
                </button>
              </div>
            )}

          </div>
          
          <div className="shift-palette">
            <div className="palette-title">Schichten zuweisen (ziehen & ablegen oder Klick für Auswahl):</div>
            <div className="palette-buttons">
              <div
                draggable
                onClick={() => handlePaletteClick('Frühschicht')}
                onDragStart={(e) => handleEmployeeViewDragStart(e, 'Frühschicht')}
                onDragEnd={handleEmployeeViewDragEnd}
                className={`palette-item palette-frueh ${draggedShiftType === 'Frühschicht' ? 'dragging' : ''}`}
                title="Frühschicht zuweisen"
              >
                F - Früh
              </div>
              <div
                draggable
                onClick={() => handlePaletteClick('Mittelschicht')}
                onDragStart={(e) => handleEmployeeViewDragStart(e, 'Mittelschicht')}
                onDragEnd={handleEmployeeViewDragEnd}
                className={`palette-item palette-mittel ${draggedShiftType === 'Mittelschicht' ? 'dragging' : ''}`}
                title="Mittelschicht zuweisen"
              >
                M - Mittel
              </div>
              <div
                draggable
                onClick={() => handlePaletteClick('Spätschicht')}
                onDragStart={(e) => handleEmployeeViewDragStart(e, 'Spätschicht')}
                onDragEnd={handleEmployeeViewDragEnd}
                className={`palette-item palette-spaet ${draggedShiftType === 'Spätschicht' ? 'dragging' : ''}`}
                title="Spätschicht zuweisen"
              >
                S - Spät
              </div>
              <div
                draggable
                onClick={() => handlePaletteClick('Urlaub')}
                onDragStart={(e) => handleEmployeeViewDragStart(e, 'Urlaub')}
                onDragEnd={handleEmployeeViewDragEnd}
                className={`palette-item palette-urlaub ${draggedShiftType === 'Urlaub' ? 'dragging' : ''}`}
                title="Urlaub zuweisen"
              >
                U - Urlaub
              </div>
              <div
                draggable
                onClick={() => handlePaletteClick('Krank')}
                onDragStart={(e) => handleEmployeeViewDragStart(e, 'Krank')}
                onDragEnd={handleEmployeeViewDragEnd}
                className={`palette-item palette-krank ${draggedShiftType === 'Krank' ? 'dragging' : ''}`}
                title="Krank zuweisen"
              >
                K - Krank
              </div>
            </div>
            <div className="palette-hint">
              💡 Tipp: Ziehen Sie eine Schicht auf eine Zelle oder klicken Sie bei markierten Feldern auf den Button, um alle ausgewählten Tage zu belegen. Ziehen Sie erneut auf eine belegte Zelle, um sie zu entfernen.
            </div>
          </div>

          {showWeekCopyDialog && (
            <div className="week-copy-dialog-overlay" onClick={() => setShowWeekCopyDialog(false)}>
              <div className="week-copy-dialog" onClick={(e) => e.stopPropagation()}>
                <h3>📋 Woche kopieren</h3>
                <p className="dialog-description">
                  Wählen Sie die Quellwoche (von) und die Zielwoche (nach) aus. Der Wochenplan wird von der Quellwoche zur Zielwoche kopiert.
                </p>
                
                <div className="dialog-section">
                  <label className="dialog-label">
                    <strong>Von Woche (Quelle):</strong>
                  </label>
                  <div className="calendar-week-view">
                    <div className="calendar-nav">
                      <button 
                        type="button"
                        onClick={() => changeCopyWeek('prev', 'source')}
                        className="calendar-nav-btn"
                      >
                        ←
                      </button>
                      <div className="calendar-week-range">
                        {getWeekRangeForDate(copySourceWeek)}
                      </div>
                      <button 
                        type="button"
                        onClick={() => changeCopyWeek('next', 'source')}
                        className="calendar-nav-btn"
                      >
                        →
                      </button>
                    </div>
                    <div className="calendar-week-grid">
                      {getWeekDatesForCalendar(getMondayOfWeek(copySourceWeek)).map(({ date, day, dayName }) => {
                        const isSelected = getMondayOfWeek(copySourceWeek) === getMondayOfWeek(date);
                        const isToday = date === new Date().toISOString().split('T')[0];
                        return (
                          <div
                            key={date}
                            className={`calendar-week-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => {
                              const monday = getMondayOfWeek(date);
                              setCopySourceWeek(monday);
                              const month = `${new Date(monday).getFullYear()}-${String(new Date(monday).getMonth() + 1).padStart(2, '0')}`;
                              setCopySourceMonth(month);
                            }}
                            title={new Date(date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          >
                            <div className="calendar-day-name">{dayName}</div>
                            <div className="calendar-day-number">{day}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="dialog-section">
                  <label className="dialog-label">
                    <strong>Nach Woche (Ziel):</strong>
                  </label>
                  <div className="calendar-month-view">
                    <div className="calendar-nav">
                      <button 
                        type="button"
                        onClick={() => changeCopyMonth('prev', 'target')}
                        className="calendar-nav-btn"
                      >
                        ←
                      </button>
                      <div className="calendar-month-name">
                        {new Date(copyTargetMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                      </div>
                      <button 
                        type="button"
                        onClick={() => changeCopyMonth('next', 'target')}
                        className="calendar-nav-btn"
                      >
                        →
                      </button>
                    </div>
                    <div className="calendar-month-grid">
                      <div className="calendar-weekday-header">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                          <div key={day} className="calendar-weekday">{day}</div>
                        ))}
                      </div>
                      <div className="calendar-days-grid">
                        {getMonthDatesForCalendar(copyTargetMonth).map(({ date, day, isCurrentMonth }) => {
                          const targetMonday = getMondayOfWeek(copyTargetWeek);
                          const dateMonday = getMondayOfWeek(date);
                          const isSelected = targetMonday === dateMonday;
                          // Check if this date is part of the selected week
                          const selectedWeekStart = new Date(targetMonday);
                          const selectedWeekEnd = new Date(selectedWeekStart);
                          selectedWeekEnd.setDate(selectedWeekStart.getDate() + 6);
                          const currentDate = new Date(date);
                          const isInSelectedWeek = currentDate >= selectedWeekStart && currentDate <= selectedWeekEnd && targetMonday !== '';
                          const isToday = date === new Date().toISOString().split('T')[0];
                          return (
                            <div
                              key={date}
                              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isInSelectedWeek && !isSelected ? 'in-selected-week' : ''} ${isToday ? 'today' : ''}`}
                              onClick={() => {
                                const monday = getMondayOfWeek(date);
                                setCopyTargetWeek(monday);
                                const month = `${new Date(monday).getFullYear()}-${String(new Date(monday).getMonth() + 1).padStart(2, '0')}`;
                                setCopyTargetMonth(month);
                              }}
                              title={new Date(date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="calendar-week-preview">
                      Zielwoche: {getWeekRangeForDate(copyTargetWeek)}
                    </div>
                  </div>
                </div>

                <div className="dialog-actions">
                  <button onClick={handleWeekCopy} className="btn-dialog-confirm">
                    ✓ Kopieren
                  </button>
                  <button onClick={() => setShowWeekCopyDialog(false)} className="btn-dialog-cancel">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}

          {employeeViewMode === 'week' ? (
            <div className="employee-overview-wrapper">
              <table className="employee-overview-table">
                <thead>
                  <tr>
                    <th className="employee-name-header">Mitarbeiter</th>
                    {weekSchedule.map((day, index) => (
                      <th key={day.date} className="employee-day-header">
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
                  {employees.map(employee => (
                    <tr key={employee.id}>
                      <td className="employee-name-cell">
                        <div className="employee-name-with-color">
                          {employee.color && (
                            <span 
                              className="employee-color-bar" 
                              style={{ backgroundColor: getColorValue(employee.color) }}
                              title={employee.color}
                            ></span>
                          )}
                          <span className="employee-name-text">
                            {employee.firstName} {employee.lastName}
                          </span>
                        </div>
                      </td>
                      {weekSchedule.map(day => {
                        const shifts = getEmployeeShiftsForDate(employee.id, day.date);
                        const hasShift = shifts.length > 0;
                        const isUrlaub = shifts.includes('U');
                        const isKrank = shifts.includes('K');
                        const isSelected = selectedCells.has(getCellKey(employee.id, day.date));
                        const isHovered = hoveredDropCell?.employeeId === employee.id && hoveredDropCell?.dateStr === day.date;
                        const isInSelectedGroup = isSelected && selectedCells.size > 0 && (draggedShiftType || draggedShiftFromCell);
                        
                        const dateDisplay = new Date(day.date).toLocaleDateString('de-DE', { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: '2-digit' 
                        });
                        
                        let cellTitle = multiSelectTooltip;
                        const currentShiftType = draggedShiftFromCell?.shiftType || draggedShiftType;
                        if (isHovered && currentShiftType) {
                          if (draggedShiftFromCell) {
                            const sourceDate = new Date(draggedShiftFromCell.dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                            cellTitle = `${currentShiftType} von ${sourceDate} nach ${dateDisplay} kopieren`;
                          } else {
                            cellTitle = `${currentShiftType} zuweisen: ${dateDisplay}`;
                          }
                        } else if (isInSelectedGroup && currentShiftType) {
                          if (draggedShiftFromCell) {
                            const sourceDate = new Date(draggedShiftFromCell.dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                            cellTitle = `${currentShiftType} von ${sourceDate} wird auf ${selectedCells.size} ausgewählte Tage kopiert`;
                          } else {
                            cellTitle = `${currentShiftType} wird allen ${selectedCells.size} ausgewählten Tagen zugewiesen`;
                          }
                        }
                        
                        return (
                          <td 
                            key={day.date} 
                            className={`employee-shift-cell ${(draggedShiftType || draggedShiftFromCell) ? 'drop-zone-active' : ''} ${isHovered ? 'drop-zone-hovered' : ''} ${isInSelectedGroup ? 'drop-zone-selected-group' : ''} ${isUrlaub ? 'status-urlaub' : ''} ${isKrank ? 'status-krank' : ''} ${isSelected ? 'cell-selected' : ''}`}
                            onDragOver={(e) => handleEmployeeViewDragOver(e, employee.id, day.date)}
                            onDragLeave={handleEmployeeViewDragLeave}
                            onDrop={(e) => handleEmployeeViewDrop(e, employee.id, day.date)}
                            onClick={(e) => handleCellClick(e, employee.id, day.date)}
                            title={cellTitle}
                          >
                            {hasShift ? (
                              <div className="shift-abbreviations">
                                {shifts.map((shiftAbbrev, idx) => {
                                  const shiftType = getShiftTypeFromAbbreviation(shiftAbbrev);
                                  if (!shiftType) return <span key={idx}>{shiftAbbrev} </span>;
                                  
                                  return (
                                    <span
                                      key={idx}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation(); // Prevent event from bubbling to td
                                        handleShiftDragStart(e, employee.id, day.date, shiftType);
                                      }}
                                      onDragEnd={(e) => {
                                        e.stopPropagation(); // Prevent event from bubbling to td
                                        handleShiftDragEnd(e);
                                      }}
                                      className="shift-abbreviation-draggable"
                                      title={`${shiftType} ziehen zum Kopieren`}
                                    >
                                      {shiftAbbrev}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="no-shift">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="employee-month-wrapper">
              <table className="employee-month-table">
                <thead>
                  <tr>
                    <th className="employee-name-header">Mitarbeiter</th>
                    {(() => {
                      const monthDates = getMonthDates(currentMonth);
                      return monthDates.map(dateStr => {
                        const date = new Date(dateStr);
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <th 
                            key={dateStr} 
                            className={`employee-month-day-header ${isWeekend ? 'weekend' : ''}`}
                          >
                            <div className="day-name-small">{getDayName(dateStr)}</div>
                            <div className="day-date-small">
                              {date.getDate()}
                            </div>
                          </th>
                        );
                      });
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id}>
                      <td className="employee-name-cell">
                        <div className="employee-name-with-color">
                          {employee.color && (
                            <span 
                              className="employee-color-bar" 
                              style={{ backgroundColor: getColorValue(employee.color) }}
                              title={employee.color}
                            ></span>
                          )}
                          <span className="employee-name-text">
                            {employee.firstName} {employee.lastName}
                          </span>
                        </div>
                      </td>
                      {(() => {
                        const monthDates = getMonthDates(currentMonth);
                        return monthDates.map(dateStr => {
                          const shifts = getEmployeeShiftsForDate(employee.id, dateStr);
                          const hasShift = shifts.length > 0;
                          const isUrlaub = shifts.includes('U');
                          const isKrank = shifts.includes('K');
                          const isSelected = selectedCells.has(getCellKey(employee.id, dateStr));
                          const date = new Date(dateStr);
                          const dayOfWeek = date.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          
                          const isHovered = hoveredDropCell?.employeeId === employee.id && hoveredDropCell?.dateStr === dateStr;
                          const isInSelectedGroup = isSelected && selectedCells.size > 0 && (draggedShiftType || draggedShiftFromCell);
                          const dateDisplay = new Date(dateStr).toLocaleDateString('de-DE', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: '2-digit' 
                          });
                          
                          // Determine title based on state
                        let cellTitle = multiSelectTooltip;
                          const currentShiftType = draggedShiftFromCell?.shiftType || draggedShiftType;
                          if (isHovered && currentShiftType) {
                            if (draggedShiftFromCell) {
                              const sourceDate = new Date(draggedShiftFromCell.dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                              cellTitle = `${currentShiftType} von ${sourceDate} nach ${dateDisplay} kopieren`;
                            } else {
                              cellTitle = `${currentShiftType} zuweisen: ${dateDisplay}`;
                            }
                          } else if (isInSelectedGroup && currentShiftType) {
                            if (draggedShiftFromCell) {
                              const sourceDate = new Date(draggedShiftFromCell.dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                              cellTitle = `${currentShiftType} von ${sourceDate} wird auf ${selectedCells.size} ausgewählte Tage kopiert`;
                            } else {
                              cellTitle = `${currentShiftType} wird allen ${selectedCells.size} ausgewählten Tagen zugewiesen`;
                            }
                          }
                          
                          return (
                            <td 
                              key={dateStr} 
                              className={`employee-shift-cell-month ${(draggedShiftType || draggedShiftFromCell) ? 'drop-zone-active' : ''} ${isHovered ? 'drop-zone-hovered' : ''} ${isInSelectedGroup ? 'drop-zone-selected-group' : ''} ${isUrlaub ? 'status-urlaub' : ''} ${isKrank ? 'status-krank' : ''} ${isSelected ? 'cell-selected' : ''} ${isWeekend ? 'weekend' : ''}`}
                              onDragOver={(e) => handleEmployeeViewDragOver(e, employee.id, dateStr)}
                              onDragLeave={handleEmployeeViewDragLeave}
                              onDrop={(e) => handleEmployeeViewDrop(e, employee.id, dateStr)}
                              onClick={(e) => handleCellClick(e, employee.id, dateStr)}
                              title={cellTitle}
                            >
                              {hasShift ? (
                                <div className="shift-abbreviations-small">
                                  {shifts.map((shiftAbbrev, idx) => {
                                    const shiftType = getShiftTypeFromAbbreviation(shiftAbbrev);
                                    if (!shiftType) return <span key={idx}>{shiftAbbrev} </span>;
                                    
                                    return (
                                      <span
                                        key={idx}
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation(); // Prevent event from bubbling to td
                                          handleShiftDragStart(e, employee.id, dateStr, shiftType);
                                        }}
                                        onDragEnd={(e) => {
                                          e.stopPropagation(); // Prevent event from bubbling to td
                                          handleShiftDragEnd(e);
                                        }}
                                        className="shift-abbreviation-draggable-small"
                                        title={`${shiftType} ziehen zum Kopieren`}
                                      >
                                        {shiftAbbrev}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="no-shift-small">—</span>
                              )}
                            </td>
                          );
                        });
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="week-view-container">
          {AREAS.map(area => (
          <div key={area} className="area-section">
            <h2 className="area-title">{area}</h2>
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
                      <td className="shift-name">{shift}</td>
                      {weekSchedule.map(day => {
                        const assignments = day.shifts[area]?.[shift] || [];
                        // Filter employees who can work in this area
                        const availableEmployees = employees.filter(emp => emp.areas.includes(area));
                        const underStaffed = isUnderStaffed(area, shift, assignments.length);
                        
                        return (
                          <td 
                            key={day.date} 
                            className={`shift-cell ${underStaffed ? 'understaffed' : ''} ${draggedEmployee ? 'drop-zone' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day.date, area, shift)}
                          >
                            <div className="shift-content">
                              {assignments.map(assignment => {
                                const employee = employees.find(e => e.id === assignment.employeeId);
                                return (
                                  <div 
                                    key={assignment.employeeId} 
                                    className="assignment-tag draggable"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, assignment.employeeId, assignment.employeeName, day.date, area, shift)}
                                    onDragEnd={handleDragEnd}
                                    title="Zum Kopieren ziehen"
                                  >
                                    <span className="drag-handle">⋮⋮</span>
                                    {employee?.color && (
                                      <span 
                                        className="employee-color-bar-small" 
                                        style={{ backgroundColor: getColorValue(employee.color) }}
                                        title={employee.color}
                                      ></span>
                                    )}
                                    <span>{assignment.employeeName}</span>
                                    <button
                                      onClick={() => removeAssignment(day.date, area, shift, assignment.employeeId)}
                                      className="btn-remove"
                                      title="Entfernen"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                              
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    assignEmployee(day.date, area, shift, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="employee-select"
                                defaultValue=""
                              >
                                <option value="">+ Zuweisen</option>
                                {availableEmployees.map(emp => {
                                  const isAssigned = isEmployeeAssignedOnDate(day.date, emp.id);
                                  return (
                                    <option 
                                      key={emp.id} 
                                      value={emp.id}
                                      disabled={isAssigned}
                                      style={isAssigned ? { color: '#999', fontStyle: 'italic' } : {}}
                                    >
                                      {emp.firstName} {emp.lastName} {isAssigned ? '(bereits eingeteilt)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
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
      )}

      <div className="employees-list">
        <h3>Mitarbeiter-Übersicht ({employees.length})</h3>
        <div className="employee-details-grid">
          {employees.map(emp => {
            const workedHours = calculateWeeklyHours(emp.id);
            const hoursStatus = getHoursStatus(emp.id, emp.weeklyHours);
            
            return (
              <div key={emp.id} className={`employee-detail-card hours-${hoursStatus}`}>
                <div className="emp-card-header">
                  <h4>
                    <div className="employee-name-with-color">
                      {emp.color && (
                        <span 
                          className="employee-color-bar" 
                          style={{ backgroundColor: getColorValue(emp.color) }}
                          title={emp.color}
                        ></span>
                      )}
                      <span className="employee-name-text">
                        {emp.firstName} {emp.lastName}
                      </span>
                    </div>
                  </h4>
                  <span className="emp-id">ID: {emp.id.slice(-4)}</span>
                </div>
                <div className="emp-card-body">
                  <div className="emp-info-row">
                    <span className="emp-label">📍 Bereiche:</span>
                    <span className="emp-value">{emp.areas.join(', ')}</span>
                  </div>
                  
                  {/* Weekly Hours Status */}
                  <div className="emp-info-row hours-row">
                    <span className="emp-label">⏱️ Wochenstunden:</span>
                    <span className="emp-value hours-value">
                      <strong>{workedHours}h</strong>
                      {emp.weeklyHours && (
                        <>
                          {' / '}
                          <span className="target-hours">{emp.weeklyHours}h</span>
                        </>
                      )}
                    </span>
                  </div>
                  
                  {emp.weeklyHours && (
                    <div className="hours-progress">
                      <div 
                        className={`progress-bar ${hoursStatus}`}
                        style={{ width: `${Math.min((workedHours / emp.weeklyHours) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                  
                  {emp.phone && (
                    <div className="emp-info-row">
                      <span className="emp-label">📞 Telefon:</span>
                      <span className="emp-value">{emp.phone}</span>
                    </div>
                  )}
                  {emp.email && (
                    <div className="emp-info-row">
                      <span className="emp-label">✉️ E-Mail:</span>
                      <span className="emp-value">{emp.email}</span>
                    </div>
                  )}
                </div>
                
                {hoursStatus === 'fulfilled' && (
                  <div className="status-badge fulfilled">✅ Soll erfüllt</div>
                )}
                {hoursStatus === 'under' && emp.weeklyHours && (
                  <div className="status-badge under">
                    ⚠️ {emp.weeklyHours - workedHours}h fehlen
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
