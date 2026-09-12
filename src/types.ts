export interface ClassInfo {
  schoolName: string;
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  announcement?: string;
}

export interface Student {
  id: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD or DD/MM/YYYY
  gender: 'Nam' | 'Nữ' | '';
  fatherPhone: string;
  motherPhone: string;
  boarder: boolean; // Bán trú
  bus: boolean; // Xe bus
  busNumber: string; // Số xe
  busStop: string; // Điểm đón
  parentToken: string; // Secret token for parent link
  notes?: string;
  createdAt: number;
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late';

export interface AttendanceSession {
  id: string;
  date: string; // YYYY-MM-DD
  session: 'morning' | 'afternoon'; // Buổi sáng / Buổi chiều
  records: Record<string, AttendanceStatus>; // studentId -> status
  note?: string;
  createdAt: number;
}

export interface AssessmentColumn {
  id: string;
  subject: string;
  coefficient: number; // Hệ số (thường 1, 2, 3)
}

export interface AssessmentBatch {
  id: string;
  name: string; // e.g. "Khảo sát đầu năm", "Giữa học kỳ 1"
  date: string; // YYYY-MM-DD
  columns: AssessmentColumn[];
  // studentId -> columnId -> score (number or null)
  scores: Record<string, Record<string, number | null>>;
  createdAt: number;
}

export interface ViolationTemplate {
  id: string;
  title: string;
  points: number; // e.g., -2, -1, +2
  type: 'violation' | 'achievement';
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  type: 'violation' | 'achievement';
  title: string;
  points: number; // negative for violation, positive for achievement
  note?: string;
  createdAt: number;
}

export type TabType = 
  | 'overview' 
  | 'students' 
  | 'attendance' 
  | 'assessments' 
  | 'discipline' 
  | 'parent-portal' 
  | 'settings';

export type ViewType = TabType;
