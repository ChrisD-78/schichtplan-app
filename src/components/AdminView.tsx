import React, { useState } from 'react';
import { ShiftType, AreaType, DaySchedule, Employee, ShiftAssignment } from '../types';

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
  const [newEmployeeAreas, setNewEmployeeAreas] = useState<AreaType[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  
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
      areas: [...newEmployeeAreas]
    };
    
    const updatedEmployees = [...employees, newEmployee];
    onEmployeesUpdate(updatedEmployees);
    
    setNewEmployeeFirstName('');
    setNewEmployeeLastName('');
    setNewEmployeeAreas([]);
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
              <div className="name-inputs">
                <input
                  type="text"
                  value={newEmployeeFirstName}
                  onChange={(e) => setNewEmployeeFirstName(e.target.value)}
                  placeholder="Vorname"
                  className="input-employee"
                />
                <input
                  type="text"
                  value={newEmployeeLastName}
                  onChange={(e) => setNewEmployeeLastName(e.target.value)}
                  placeholder="Nachname"
                  className="input-employee"
                  onKeyPress={(e) => e.key === 'Enter' && addEmployee()}
                />
              </div>
              <div className="area-assignment">
                <label>Einsatzbereiche (max. 4):</label>
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
              <button onClick={addEmployee} className="btn-add-employee">Hinzufügen</button>
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
                              {assignments.map(assignment => (
                                <div 
                                  key={assignment.employeeId} 
                                  className="assignment-tag draggable"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, assignment.employeeId, assignment.employeeName, day.date, area, shift)}
                                  onDragEnd={handleDragEnd}
                                  title="Zum Kopieren ziehen"
                                >
                                  <span className="drag-handle">⋮⋮</span>
                                  <span>{assignment.employeeName}</span>
                                  <button
                                    onClick={() => removeAssignment(day.date, area, shift, assignment.employeeId)}
                                    className="btn-remove"
                                    title="Entfernen"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              
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

      <div className="employees-list">
        <h3>Mitarbeiter ({employees.length})</h3>
        <div className="employee-tags">
          {employees.map(emp => (
            <div key={emp.id} className="employee-card">
              <span className="emp-name">{emp.firstName} {emp.lastName}</span>
              <span className="emp-areas">{emp.areas.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
