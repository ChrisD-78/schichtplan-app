export type ShiftType = 'Frühschicht' | 'Mittelschicht' | 'Spätschicht';
export type AreaType = 'Halle' | 'Kasse' | 'Sauna' | 'Reinigung' | 'Gastro';
export type EmployeeColor = 'Rot' | 'Braun' | 'Schwarz' | 'Grün' | 'Violett';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  areas: AreaType[]; // Assigned work areas (max 4)
  phone?: string;
  email?: string;
  weeklyHours?: number;
  color?: EmployeeColor;
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

export type SpecialStatus = 'Urlaub' | 'Krank' | 'Urlaub_beantragt' | 'Urlaub_genehmigt' | 'Urlaub_abgelehnt';

export type VacationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface VacationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: VacationRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface Notification {
  id: string;
  employeeId: string;
  type: 'vacation_approved' | 'vacation_rejected';
  message: string;
  date: string;
  read: boolean;
  createdAt: string;
}

export interface DaySchedule {
  date: string;
  shifts: {
    [key in AreaType]: {
      [key in ShiftType]?: ShiftAssignment[];
    };
  };
  specialStatus?: {
    [employeeId: string]: SpecialStatus;
  };
}

