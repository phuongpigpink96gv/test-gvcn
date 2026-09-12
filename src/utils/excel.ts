import * as XLSX from 'xlsx';
import { Student } from '../types';
import { generateId, generateToken } from '../storage';

/**
 * Normalizes boolean values for Boarder (Bán trú) and Bus (Xe bus)
 * Matches: x, X, ✓, ✔, Có, CÓ, có, Yes, TRUE, 1 -> true
 * Matches: Không, KHÔNG, không, No, FALSE, 0, blank/null/undefined -> false
 */
export function parseVietnameseBoolean(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;

  const str = String(val).trim().toLowerCase();
  if (['x', '✓', '✔', 'có', 'co', 'yes', 'true', '1'].includes(str)) {
    return true;
  }
  return false;
}

/**
 * Robust Vietnamese Birthdate normalizer.
 * Accurately parses Excel serial dates, DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, YYYY-MM-DD,
 * strings with timestamps, and JavaScript Date objects into standard ISO "YYYY-MM-DD"
 * so that HTML5 <input type="date"> and display logic work 100% reliably.
 */
export function formatBirthDateToISO(rawVal: any): string {
  if (rawVal === null || rawVal === undefined) return '';

  // Case 1: JavaScript Date instance
  if (rawVal instanceof Date) {
    if (isNaN(rawVal.getTime())) return '';
    const y = rawVal.getFullYear();
    const m = String(rawVal.getMonth() + 1).padStart(2, '0');
    const d = String(rawVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case 2: Excel Serial Date (numbers around 15000 - 80000)
  const numVal = typeof rawVal === 'number' ? rawVal : Number(String(rawVal).trim());
  if (!isNaN(numVal) && numVal > 15000 && numVal < 80000) {
    try {
      const parsed = XLSX.SSF.parse_date_code(Math.floor(numVal));
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // ignore and fallback
    }
  }

  let str = String(rawVal).trim().replace(/\u00A0/g, ' ');
  if (!str) return '';

  // Remove time portion if exists, e.g. "14/05/2010 00:00:00" -> "14/05/2010"
  if (str.includes(' ')) {
    str = str.split(' ')[0].trim();
  }

  // Case 3: Already YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/.]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Case 4: DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    const p1 = parts[0].trim();
    const p2 = parts[1].trim();
    const p3 = parts[2].trim();

    // Check if format is YYYY/MM/DD
    if (p1.length === 4 && !isNaN(Number(p1))) {
      const y = p1;
      const m = p2.padStart(2, '0');
      const d = p3.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Format is DD/MM/YYYY
    let y = p3;
    if (y.length === 2) {
      const numY = Number(y);
      y = numY > 50 ? `19${y}` : `20${y}`;
    }
    if (y.length === 4 && !isNaN(Number(y))) {
      const d = p1.padStart(2, '0');
      const m = p2.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Case 5: 4-digit Year only (e.g. "2010")
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  return str;
}

/**
 * Format ISO YYYY-MM-DD to Vietnamese display DD/MM/YYYY
 */
export function formatBirthDateDisplay(isoDate: string): string {
  if (!isoDate) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

/**
 * Vietnamese diacritic stripper for fuzzy matching
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Parses an Excel or CSV file containing student rosters
 */
export async function parseStudentsExcelFile(file: File): Promise<Partial<Student>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel không có sheet nào.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    throw new Error('File Excel không có đủ dữ liệu.');
  }

  // Scan up to row 25 for header row
  let headerRowIndex = 0;
  let nameColIdx = -1;
  let hoDemColIdx = -1;
  let tenColIdx = -1;
  let dobColIdx = -1;
  let dobDayColIdx = -1;
  let dobMonthColIdx = -1;
  let dobYearColIdx = -1;
  let genderColIdx = -1;
  let fatherPhoneColIdx = -1;
  let motherPhoneColIdx = -1;
  let boarderColIdx = -1;
  let busColIdx = -1;
  let busNumColIdx = -1;
  let busStopColIdx = -1;

  for (let r = 0; r < Math.min(25, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (
        cell.includes('họ và tên') || 
        cell.includes('họ tên') || 
        cell.includes('họ và tên học sinh') || 
        cell === 'tên học sinh' || 
        cell === 'họ tên hs'
      ) {
        nameColIdx = c;
        headerRowIndex = r;
      } else if (cell === 'họ' || cell.includes('họ đệm') || cell.includes('họ và chữ đệm') || cell.includes('họ lót')) {
        hoDemColIdx = c;
        headerRowIndex = r;
      } else if (cell === 'tên' || cell === 'ten') {
        tenColIdx = c;
        headerRowIndex = r;
      }
    }
    if (nameColIdx !== -1 || (hoDemColIdx !== -1 && tenColIdx !== -1)) break;
  }

  // Fallback: search for first column with name-like headers
  if (nameColIdx === -1 && (hoDemColIdx === -1 || tenColIdx === -1)) {
    for (let c = 0; c < (rows[headerRowIndex] || []).length; c++) {
      const cell = String(rows[headerRowIndex][c] || '').trim().toLowerCase();
      if (cell.includes('tên') || cell.includes('họ')) {
        nameColIdx = c;
        break;
      }
    }
    if (nameColIdx === -1) nameColIdx = 1; // Default 2nd column
  }

  const headerRow = rows[headerRowIndex] || [];
  for (let c = 0; c < headerRow.length; c++) {
    const cell = String(headerRow[c] || '').trim().toLowerCase();
    if (
      cell.includes('ngày sinh') || 
      cell.includes('năm sinh') || 
      cell.includes('ngaysinh') || 
      cell === 'ns' || 
      cell.includes('sinh ngày') ||
      cell === 'dob'
    ) {
      dobColIdx = c;
    } else if (cell === 'ngày' || cell === 'ngay') {
      dobDayColIdx = c;
    } else if (cell === 'tháng' || cell === 'thang') {
      dobMonthColIdx = c;
    } else if (cell === 'năm' || cell === 'nam') {
      dobYearColIdx = c;
    } else if (cell.includes('giới tính') || cell === 'gt' || cell === 'nam/nữ' || cell === 'phái') {
      genderColIdx = c;
    } else if (cell.includes('cha') || cell.includes('bố') || cell.includes('phụ huynh')) {
      fatherPhoneColIdx = c;
    } else if (cell.includes('mẹ') || cell.includes('sđt mẹ')) {
      motherPhoneColIdx = c;
    } else if (cell.includes('bán trú') || cell.includes('ăn trưa') || cell === 'bt') {
      boarderColIdx = c;
    } else if (cell.includes('xe bus') || cell.includes('xe buýt') || cell.includes('đưa đón') || cell === 'bus') {
      busColIdx = c;
    } else if (cell.includes('số xe') || cell.includes('tuyến xe') || cell.includes('tuyến bus')) {
      busNumColIdx = c;
    } else if (cell.includes('điểm đón') || cell.includes('trạm đón') || cell.includes('nơi đón')) {
      busStopColIdx = c;
    }
  }

  const parsedStudents: Partial<Student>[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Resolve full name (handling combined or separate columns)
    let rawName = '';
    if (hoDemColIdx !== -1 && tenColIdx !== -1) {
      const hoDem = String(row[hoDemColIdx] || '').trim();
      const ten = String(row[tenColIdx] || '').trim();
      rawName = `${hoDem} ${ten}`.trim();
    } else if (nameColIdx !== -1) {
      rawName = String(row[nameColIdx] || '').trim();
    }

    if (
      !rawName || 
      rawName.toLowerCase().includes('tổng cộng') || 
      rawName.toLowerCase().includes('họ và tên') ||
      rawName.toLowerCase().includes('danh sách')
    ) {
      continue;
    }

    // Gender parsing
    let gender: 'Nam' | 'Nữ' | '' = '';
    if (genderColIdx !== -1) {
      const gStr = String(row[genderColIdx] || '').trim().toLowerCase();
      if (gStr === 'nam' || gStr === 'm' || gStr === '1' || gStr === 'x') gender = 'Nam';
      else if (gStr === 'nữ' || gStr === 'nu' || gStr === 'f' || gStr === '0') gender = 'Nữ';
    }

    // Date of birth parsing with formatBirthDateToISO
    let birthDate = '';
    if (dobColIdx !== -1) {
      birthDate = formatBirthDateToISO(row[dobColIdx]);
    } else if (dobDayColIdx !== -1 && dobMonthColIdx !== -1 && dobYearColIdx !== -1) {
      const d = String(row[dobDayColIdx] || '').trim().padStart(2, '0');
      const m = String(row[dobMonthColIdx] || '').trim().padStart(2, '0');
      let y = String(row[dobYearColIdx] || '').trim();
      if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
      if (d && m && y) {
        birthDate = `${y}-${m}-${d}`;
      }
    }

    // Phones
    const fatherPhone = fatherPhoneColIdx !== -1 ? String(row[fatherPhoneColIdx] || '').trim() : '';
    const motherPhone = motherPhoneColIdx !== -1 ? String(row[motherPhoneColIdx] || '').trim() : '';

    // Boarder & Bus logic
    const boarder = boarderColIdx !== -1 ? parseVietnameseBoolean(row[boarderColIdx]) : false;
    const bus = busColIdx !== -1 ? parseVietnameseBoolean(row[busColIdx]) : false;
    const busNumber = busNumColIdx !== -1 ? String(row[busNumColIdx] || '').trim() : '';
    const busStop = busStopColIdx !== -1 ? String(row[busStopColIdx] || '').trim() : '';

    parsedStudents.push({
      id: generateId('stu'),
      fullName: rawName,
      birthDate,
      gender,
      fatherPhone,
      motherPhone,
      boarder,
      bus,
      busNumber,
      busStop,
      parentToken: generateToken(),
      createdAt: Date.now(),
    });
  }

  return parsedStudents;
}

/**
 * Downloads a pre-formatted Excel template for importing students
 */
export function downloadStudentTemplate() {
  const data = [
    ['STT', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'SĐT cha', 'SĐT mẹ', 'Bán trú', 'Xe bus', 'Số xe', 'Điểm đón'],
    [1, 'Nguyễn Văn An', '14/05/2010', 'Nam', '0912345678', '0987654321', 'Có', 'Có', 'Bus 05', 'Ngã tư Kim Mã'],
    [2, 'Trần Thị Bình', '20/08/2010', 'Nữ', '0901234567', '0912987654', 'Không', 'Không', '', ''],
    [3, 'Lê Hoàng Cường', '03/11/2010', 'Nam', '0933445566', '', 'Có', 'Không', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
  XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh_GVCN360.xlsx');
}

export interface ParsedGradesResult {
  subjects: string[];
  results: {
    studentId: string;
    studentName: string;
    matched: boolean;
    scores: Record<string, number | null>;
  }[];
  unmatchedNames: string[];
  scanMethod: 'rule' | 'ai';
}

/**
 * Parses an Excel file for scores across multiple subjects with smart column detection
 * and fuzzy name matching.
 */
export async function parseGradesExcelFile(
  file: File,
  existingStudents: Student[]
): Promise<ParsedGradesResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('File không có sheet nào.');

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('File điểm không đủ dữ liệu.');

  // Find header row and name columns (search up to row 30)
  let headerRowIndex = 0;
  let nameColIdx = -1;
  let hoDemColIdx = -1;
  let tenColIdx = -1;

  for (let r = 0; r < Math.min(30, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toLowerCase();
      if (
        cell.includes('họ và tên') || 
        cell.includes('họ tên') || 
        cell === 'tên học sinh' || 
        cell === 'học sinh' ||
        cell === 'họ và tên học sinh'
      ) {
        nameColIdx = c;
        headerRowIndex = r;
      } else if (cell === 'họ' || cell.includes('họ đệm') || cell.includes('họ và chữ đệm')) {
        hoDemColIdx = c;
        headerRowIndex = r;
      } else if (cell === 'tên' || cell === 'ten') {
        tenColIdx = c;
        headerRowIndex = r;
      }
    }
    if (nameColIdx !== -1 || (hoDemColIdx !== -1 && tenColIdx !== -1)) break;
  }

  if (nameColIdx === -1 && (hoDemColIdx === -1 || tenColIdx === -1)) {
    // Fallback: check column 1 or 2
    nameColIdx = 1;
  }

  const headerRow = rows[headerRowIndex] || [];
  const ignoredKeywords = [
    'stt', 'sbd', 'số báo danh', 'ngày sinh', 'năm sinh', 'lớp', 
    'ghi chú', 'họ và tên', 'họ tên', 'mã hs', 'giới tính', 'dân tộc', 
    'nơi sinh', 'điện thoại', 'sđt', 'họ đệm', 'tên'
  ];

  const subjectColumns: { index: number; name: string }[] = [];

  // 1. First pass: inspect header labels
  for (let c = 0; c < headerRow.length; c++) {
    if (c === nameColIdx || c === hoDemColIdx || c === tenColIdx) continue;
    const colHeader = String(headerRow[c] || '').trim();
    if (!colHeader) continue;
    const lower = colHeader.toLowerCase();
    const isIgnored = ignoredKeywords.some(k => lower === k || lower.startsWith(k + ' '));
    if (!isIgnored) {
      subjectColumns.push({ index: c, name: colHeader });
    }
  }

  // 2. Second pass: scan data rows to discover any numeric score columns that had non-standard headers
  const maxCols = Math.max(...rows.map(r => r.length));
  for (let c = 0; c < maxCols; c++) {
    if (c === nameColIdx || c === hoDemColIdx || c === tenColIdx) continue;
    if (subjectColumns.some(sc => sc.index === c)) continue;

    let numericScoreCount = 0;
    let nonEmptyCount = 0;

    for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 20, rows.length); r++) {
      const cell = rows[r]?.[c];
      if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
        nonEmptyCount++;
        const num = parseFloat(String(cell).replace(',', '.'));
        if (!isNaN(num) && num >= 0 && num <= 10) {
          numericScoreCount++;
        }
      }
    }

    if (nonEmptyCount >= 2 && numericScoreCount / nonEmptyCount >= 0.7) {
      const colHeader = String(headerRow[c] || '').trim() || `Cột điểm ${c + 1}`;
      subjectColumns.push({ index: c, name: colHeader });
    }
  }

  if (subjectColumns.length === 0) {
    throw new Error('Không tìm thấy cột điểm môn học nào trong bảng điểm. Hãy nhấn "AI Quét thông minh" để AI tự động phân tích file.');
  }

  // Setup normalized student maps for high-tolerance matching
  const exactMap = new Map<string, Student>();
  const accentlessMap = new Map<string, Student>();

  existingStudents.forEach(s => {
    exactMap.set(s.fullName.trim().toLowerCase(), s);
    accentlessMap.set(removeVietnameseAccents(s.fullName), s);
  });

  const subjects = subjectColumns.map(s => s.name);
  const results: {
    studentId: string;
    studentName: string;
    matched: boolean;
    scores: Record<string, number | null>;
  }[] = [];
  const unmatchedNames: string[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let rawName = '';
    if (hoDemColIdx !== -1 && tenColIdx !== -1) {
      const ho = String(row[hoDemColIdx] || '').trim();
      const ten = String(row[tenColIdx] || '').trim();
      rawName = `${ho} ${ten}`.trim();
    } else if (nameColIdx !== -1) {
      rawName = String(row[nameColIdx] || '').trim();
    }

    if (!rawName || rawName.toLowerCase().includes('tổng cộng') || rawName.toLowerCase().includes('trung bình')) {
      continue;
    }

    // Try exact match first, then accentless fuzzy match
    let matchedStudent = exactMap.get(rawName.toLowerCase());
    if (!matchedStudent) {
      matchedStudent = accentlessMap.get(removeVietnameseAccents(rawName));
    }

    const scores: Record<string, number | null> = {};

    subjectColumns.forEach(sc => {
      const rawVal = row[sc.index];
      if (
        rawVal === undefined || 
        rawVal === null || 
        String(rawVal).trim() === '' || 
        String(rawVal).trim() === '—' || 
        String(rawVal).trim() === '-'
      ) {
        scores[sc.name] = null;
      } else {
        const num = parseFloat(String(rawVal).replace(',', '.'));
        scores[sc.name] = isNaN(num) ? null : Math.round(num * 10) / 10;
      }
    });

    if (matchedStudent) {
      results.push({
        studentId: matchedStudent.id,
        studentName: matchedStudent.fullName,
        matched: true,
        scores,
      });
    } else {
      unmatchedNames.push(rawName);
      results.push({
        studentId: '',
        studentName: rawName,
        matched: false,
        scores,
      });
    }
  }

  return {
    subjects,
    results,
    unmatchedNames,
    scanMethod: 'rule',
  };
}

/**
 * AI-Powered Grade Scanner using Gemini 3.8-Flash backend
 * Sends sample rows to the AI endpoint to accurately recognize headers,
 * merged cells, abbreviations, and extract score columns.
 */
export async function parseGradesWithAI(
  file: File,
  existingStudents: Student[]
): Promise<ParsedGradesResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('File không có sheet nào.');

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('File điểm không đủ dữ liệu.');

  // Take the first 35 rows and format as lightweight JSON for Gemini
  const sampleRows = rows.slice(0, 35).map(row => 
    row.map(cell => String(cell !== null && cell !== undefined ? cell : '').trim())
  );

  const studentList = existingStudents.map(s => ({
    id: s.id,
    fullName: s.fullName,
  }));

  try {
    const response = await fetch('/api/ai-scan-grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: sampleRows,
        students: studentList,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || 'Lỗi từ máy chủ quét AI');
    }

    const aiData = await response.json();
    if (!aiData || !Array.isArray(aiData.subjects) || aiData.subjects.length === 0) {
      throw new Error('AI không nhận diện được cột điểm nào trong file này.');
    }

    return {
      subjects: aiData.subjects,
      results: aiData.results || [],
      unmatchedNames: aiData.unmatchedNames || [],
      scanMethod: 'ai',
    };
  } catch (err: any) {
    console.warn('AI scan failed or unavailable, falling back to smart rule engine:', err);
    // Automatic fallback to our smart rule-based parser
    const fallback = await parseGradesExcelFile(file, existingStudents);
    return fallback;
  }
}

/**
 * Downloads a sample Excel template for grades
 */
export function downloadGradesTemplate(students: Student[]) {
  const headers = ['STT', 'Họ và tên', 'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý'];
  const data: any[][] = [headers];

  if (students.length > 0) {
    students.forEach((s, idx) => {
      data.push([idx + 1, s.fullName, '', '', '', '', '', '', '', '']);
    });
  } else {
    data.push([1, 'Nguyễn Văn An', 8.5, 7.0, 9.0, 8.0, 7.5, '', '', '']);
    data.push([2, 'Trần Thị Bình', 9.0, 8.5, 8.0, 9.5, 8.5, '', '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');
  XLSX.writeFile(wb, 'Mau_Bang_Diem_Nhieu_Mon_GVCN360.xlsx');
}
