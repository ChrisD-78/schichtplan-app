export type ShiftType = 'Frühschicht' | 'Mittelschicht' | 'Spätschicht';
export type AreaType = 'Halle' | 'Kasse' | 'Sauna' | 'Reinigung' | 'Gastro';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  areas: AreaType[]; // Assigned work areas (max 4)
}

export interface ShiftAssignment {
  employeeId: string;
  employeeName: string;
}

export interface Shift {
  id: string;
  type: ShiftType;
  area: AreaType;
  date: string;
  assignments: ShiftAssignment[];
}

export interface DaySchedule {
  date: string;
  shifts: {
    [key in AreaType]: {
      [key in ShiftType]?: ShiftAssignment[];
    };
  };
}

