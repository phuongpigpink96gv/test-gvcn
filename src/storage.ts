import { 
  ClassInfo, 
  Student, 
  AttendanceSession, 
  AssessmentBatch, 
  DisciplineRecord, 
  ViolationTemplate 
} from './types';

const STORAGE_KEYS = {
  CLASS_INFO: 'gvcn360_class_info',
  STUDENTS: 'gvcn360_students',
  ATTENDANCE: 'gvcn360_attendance',
  ASSESSMENTS: 'gvcn360_assessments',
  DISCIPLINE: 'gvcn360_discipline',
  TEMPLATES: 'gvcn360_violation_templates',
};

export const INITIAL_CLASS_INFO: ClassInfo = {
  schoolName: '',
  className: '',
  schoolYear: '',
  homeroomTeacher: '',
  announcement: '',
};

export const DEFAULT_VIOLATION_TEMPLATES: ViolationTemplate[] = [
  { id: 'tpl-1', title: 'Đi học muộn', points: -2, type: 'violation' },
  { id: 'tpl-2', title: 'Quên sách vở / dụng cụ học tập', points: -1, type: 'violation' },
  { id: 'tpl-3', title: 'Không làm bài tập về nhà', points: -2, type: 'violation' },
  { id: 'tpl-4', title: 'Mất trật tự / Nói chuyện riêng', points: -1, type: 'violation' },
  { id: 'tpl-5', title: 'Trang phục, phù hiệu sai quy định', points: -2, type: 'violation' },
  { id: 'tpl-6', title: 'Sử dụng điện thoại trong giờ học', points: -3, type: 'violation' },
  { id: 'tpl-7', title: 'Phát biểu xây dựng bài tích cực', points: 1, type: 'achievement' },
  { id: 'tpl-8', title: 'Đạt điểm tốt (9 - 10)', points: 2, type: 'achievement' },
  { id: 'tpl-9', title: 'Gương người tốt, việc tốt', points: 2, type: 'achievement' },
];

export function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Storage loaders
export function loadClassInfo(): ClassInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASS_INFO);
    if (!raw) return { ...INITIAL_CLASS_INFO };
    return { ...INITIAL_CLASS_INFO, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Lỗi đọc class info:', e);
    return { ...INITIAL_CLASS_INFO };
  }
}

export function saveClassInfo(info: ClassInfo): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASS_INFO, JSON.stringify(info));
  } catch (e) {
    console.error('Lỗi lưu class info:', e);
  }
}

export function loadStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) return [];
    const list: Student[] = JSON.parse(raw);
    // Ensure every student has a parentToken
    return list.map(s => ({
      ...s,
      parentToken: s.parentToken || generateToken(),
    }));
  } catch (e) {
    console.error('Lỗi đọc students:', e);
    return [];
  }
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Lỗi lưu students:', e);
  }
}

export function loadAttendance(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc attendance:', e);
    return [];
  }
}

export function saveAttendance(sessions: AttendanceSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(sessions));
  } catch (e) {
    console.error('Lỗi lưu attendance:', e);
  }
}

export function loadAssessments(): AssessmentBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc assessments:', e);
    return [];
  }
}

export function saveAssessments(batches: AssessmentBatch[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(batches));
  } catch (e) {
    console.error('Lỗi lưu assessments:', e);
  }
}

export function loadDiscipline(): DisciplineRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DISCIPLINE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc discipline:', e);
    return [];
  }
}

export function saveDiscipline(records: DisciplineRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DISCIPLINE, JSON.stringify(records));
  } catch (e) {
    console.error('Lỗi lưu discipline:', e);
  }
}

export function loadViolationTemplates(): ViolationTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) return [...DEFAULT_VIOLATION_TEMPLATES];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc violation templates:', e);
    return [...DEFAULT_VIOLATION_TEMPLATES];
  }
}

export function saveViolationTemplates(templates: ViolationTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Lỗi lưu violation templates:', e);
  }
}

export function clearAllClassData(): void {
  localStorage.removeItem(STORAGE_KEYS.CLASS_INFO);
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.ASSESSMENTS);
  localStorage.removeItem(STORAGE_KEYS.DISCIPLINE);
}

export function getStudentByToken(token: string): Student | null {
  const students = loadStudents();
  return students.find(s => s.parentToken === token) || null;
}
