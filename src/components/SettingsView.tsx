import React, { useState, useEffect } from 'react';
import { 
  School, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Download, 
  Upload, 
  Trash2, 
  HelpCircle,
  Sparkles,
  Cloud,
  CloudUpload,
  CloudDownload,
  Database,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ClassInfo, Student, AttendanceSession, AssessmentBatch, DisciplineRecord, ViolationTemplate } from '../types';
import { saveClassInfo, clearAllClassData, generateId, generateToken, saveStudents, saveAttendance, saveAssessments, saveDiscipline, saveViolationTemplates, DEFAULT_VIOLATION_TEMPLATES } from '../storage';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  syncToFirebase, 
  fetchFromFirebase, 
  testFirebaseConnection, 
  FirebaseConfigType, 
  isFirebaseConfigured 
} from '../services/firebase';

interface SettingsViewProps {
  classInfo: ClassInfo;
  onUpdateClassInfo: (info: ClassInfo) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  students: Student[];
  attendance: AttendanceSession[];
  assessments: AssessmentBatch[];
  discipline: DisciplineRecord[];
  templates: ViolationTemplate[];
  onReloadAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  classInfo,
  onUpdateClassInfo,
  onShowToast,
  students,
  attendance,
  assessments,
  discipline,
  templates,
  onReloadAllData,
}) => {
  const [formData, setFormData] = useState<ClassInfo>({ ...classInfo });
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Firebase Cloud Storage State
  const [fbConfig, setFbConfig] = useState<FirebaseConfigType>(() => {
    return getSavedFirebaseConfig() || {
      apiKey: '',
      projectId: '',
      databaseURL: '',
      appId: '',
      authDomain: '',
      storageBucket: '',
    };
  });
  const [isFbActive, setIsFbActive] = useState<boolean>(isFirebaseConfigured());
  const [isTestingFb, setIsTestingFb] = useState(false);
  const [isSyncingFb, setIsSyncingFb] = useState(false);
  const [isFetchingFb, setIsFetchingFb] = useState(false);
  const [rawConfigPaste, setRawConfigPaste] = useState('');
  const [showFbGuide, setShowFbGuide] = useState(!isFirebaseConfigured());

  // Sync state if external classInfo changes
  useEffect(() => {
    setFormData({ ...classInfo });
  }, [classInfo]);

  const handleChange = (field: keyof ClassInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Kiểm tra dữ liệu
      const updated: ClassInfo = {
        schoolName: formData.schoolName.trim(),
        className: formData.className.trim(),
        schoolYear: formData.schoolYear.trim(),
        homeroomTeacher: formData.homeroomTeacher.trim(),
        announcement: formData.announcement?.trim() || '',
      };

      // 2. Lưu vào storage
      saveClassInfo(updated);

      // 3. Cập nhật giao diện ngay lập tức
      onUpdateClassInfo(updated);
      setFormData(updated);

      // 4. Hiển thị thông báo "Đã lưu"
      setIsSaved(true);
      onShowToast('Đã lưu thông tin lớp thành công!', 'success');

      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      onShowToast('Có lỗi xảy ra khi lưu thông tin.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...classInfo });
    setIsSaved(false);
    onShowToast('Đã hủy thay đổi chưa lưu', 'info');
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      classInfo: formData,
      students,
      attendance,
      assessments,
      discipline,
      templates,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sao_Luu_GVCN360_${formData.className || 'Lop'}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Đã xuất file sao lưu dữ liệu toàn bộ lớp', 'success');
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.classInfo) saveClassInfo(parsed.classInfo);
        if (parsed.students) saveStudents(parsed.students);
        if (parsed.attendance) saveAttendance(parsed.attendance);
        if (parsed.assessments) saveAssessments(parsed.assessments);
        if (parsed.discipline) saveDiscipline(parsed.discipline);
        if (parsed.templates) saveViolationTemplates(parsed.templates);

        onReloadAllData();
        onShowToast('Đã khôi phục dữ liệu từ file sao lưu thành công!', 'success');
      } catch (err) {
        console.error(err);
        onShowToast('File sao lưu không hợp lệ.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to parse pasted Firebase snippet
  const handleParseSnippet = (rawText: string) => {
    setRawConfigPaste(rawText);
    try {
      const apiKeyMatch = rawText.match(/apiKey:\s*["']([^"']+)["']/);
      const projectIdMatch = rawText.match(/projectId:\s*["']([^"']+)["']/);
      const databaseURLMatch = rawText.match(/databaseURL:\s*["']([^"']+)["']/);
      const appIdMatch = rawText.match(/appId:\s*["']([^"']+)["']/);
      const authDomainMatch = rawText.match(/authDomain:\s*["']([^"']+)["']/);
      const storageBucketMatch = rawText.match(/storageBucket:\s*["']([^"']+)["']/);

      setFbConfig(prev => ({
        ...prev,
        apiKey: apiKeyMatch ? apiKeyMatch[1] : prev.apiKey,
        projectId: projectIdMatch ? projectIdMatch[1] : prev.projectId,
        databaseURL: databaseURLMatch ? databaseURLMatch[1] : prev.databaseURL,
        appId: appIdMatch ? appIdMatch[1] : prev.appId,
        authDomain: authDomainMatch ? authDomainMatch[1] : prev.authDomain,
        storageBucket: storageBucketMatch ? storageBucketMatch[1] : prev.storageBucket,
      }));
      onShowToast('Đã trích xuất cấu hình Firebase từ đoạn dán!', 'info');
    } catch {
      // ignore
    }
  };

  // Test & Save Firebase configuration
  const handleSaveAndTestFirebase = async () => {
    if (!fbConfig.apiKey || !fbConfig.projectId) {
      onShowToast('Vui lòng nhập tối thiểu apiKey và projectId', 'error');
      return;
    }

    setIsTestingFb(true);
    try {
      const res = await testFirebaseConnection(fbConfig);
      if (res.success) {
        saveFirebaseConfig(fbConfig);
        setIsFbActive(true);
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi kiểm tra Firebase', 'error');
    } finally {
      setIsTestingFb(false);
    }
  };

  // Upload current data to Firebase
  const handleSyncToFirebase = async () => {
    setIsSyncingFb(true);
    try {
      const res = await syncToFirebase({
        classInfo: formData,
        students,
        attendance,
        assessments,
        discipline,
        templates,
      });
      if (res.success) {
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi đồng bộ lên Firebase', 'error');
    } finally {
      setIsSyncingFb(false);
    }
  };

  // Fetch data from Firebase
  const handleFetchFromFirebase = async () => {
    setIsFetchingFb(true);
    try {
      const res = await fetchFromFirebase();
      if (res.success && res.data) {
        if (res.data.classInfo) saveClassInfo(res.data.classInfo);
        if (res.data.students) saveStudents(res.data.students);
        if (res.data.attendance) saveAttendance(res.data.attendance);
        if (res.data.assessments) saveAssessments(res.data.assessments);
        if (res.data.discipline) saveDiscipline(res.data.discipline);
        if (res.data.templates) saveViolationTemplates(res.data.templates);
        onReloadAllData();
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi tải từ Firebase', 'error');
    } finally {
      setIsFetchingFb(false);
    }
  };

  // Remove Firebase configuration
  const handleDisconnectFirebase = () => {
    saveFirebaseConfig(null);
    setFbConfig({
      apiKey: '',
      projectId: '',
      databaseURL: '',
      appId: '',
      authDomain: '',
      storageBucket: '',
    });
    setIsFbActive(false);
    onShowToast('Đã xóa cấu hình Firebase. Dữ liệu quay về lưu cục bộ (Local Storage).', 'info');
  };

  // Reset to empty class
  const handleResetToEmpty = () => {
    clearAllClassData();
    onReloadAllData();
    setShowResetConfirm(false);
    onShowToast('Đã đưa dữ liệu về trạng thái lớp trống hoàn toàn.', 'info');
  };

  // Optional: Load sample demo data for quick test
  const handleLoadSampleData = () => {
    const sampleClass: ClassInfo = {
      schoolName: 'THPT Lê Quý Đôn',
      className: '10A1',
      schoolYear: '2026-2027',
      homeroomTeacher: 'Thầy Nguyễn Thành Trung',
      announcement: 'Kính gửi quý phụ huynh, tuần này lớp tiến hành khảo sát chất lượng đầu năm môn Toán, Văn, Anh.',
    };

    const sampleStudents: Student[] = [
      {
        id: generateId('stu'),
        fullName: 'Nguyễn Hoàng An',
        birthDate: '2010-02-15',
        gender: 'Nam',
        fatherPhone: '0912345678',
        motherPhone: '0987654321',
        boarder: true,
        bus: true,
        busNumber: 'Bus 01',
        busStop: 'Cổng trường Đại học Quốc gia',
        parentToken: generateToken(),
        createdAt: Date.now() - 3600000 * 24 * 5,
      },
      {
        id: generateId('stu'),
        fullName: 'Trần Thùy Chi',
        birthDate: '2010-06-20',
        gender: 'Nữ',
        fatherPhone: '0903112233',
        motherPhone: '0918445566',
        boarder: true,
        bus: false,
        busNumber: '',
        busStop: '',
        parentToken: generateToken(),
        createdAt: Date.now() - 3600000 * 24 * 4,
      },
      {
        id: generateId('stu'),
        fullName: 'Lê Tuấn Kiệt',
        birthDate: '2010-09-10',
        gender: 'Nam',
        fatherPhone: '0935667788',
        motherPhone: '',
        boarder: false,
        bus: false,
        busNumber: '',
        busStop: '',
        parentToken: generateToken(),
        createdAt: Date.now() - 3600000 * 24 * 3,
      },
      {
        id: generateId('stu'),
        fullName: 'Phạm Ngọc Mai',
        birthDate: '2010-12-05',
        gender: 'Nữ',
        fatherPhone: '',
        motherPhone: '0977889900',
        boarder: true,
        bus: true,
        busNumber: 'Bus 03',
        busStop: 'Ngã tư Kim Mã - Liễu Giai',
        parentToken: generateToken(),
        createdAt: Date.now() - 3600000 * 24 * 2,
      },
    ];

    saveClassInfo(sampleClass);
    saveStudents(sampleStudents);
    saveViolationTemplates(DEFAULT_VIOLATION_TEMPLATES);

    onReloadAllData();
    onShowToast('Đã nạp 4 học sinh mẫu thử nghiệm thành công!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Title */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <School className="w-6 h-6 text-indigo-600" />
            Cài đặt & Thông tin lớp
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Thiết lập tên trường, tên lớp, năm học và giáo viên chủ nhiệm. Dữ liệu lưu tự động vào trình duyệt.
          </p>
        </div>
        {isSaved && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Đã lưu dữ liệu
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">THÔNG TIN LỚP</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thông tin này sẽ xuất hiện trên sổ liên lạc phụ huynh và các báo cáo xuất ra
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Tên trường */}
          <div>
            <label htmlFor="input-school-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tên trường
            </label>
            <input
              type="text"
              id="input-school-name"
              value={formData.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="Nhập tên trường (ví dụ: THPT Chuyên Hà Nội - Amsterdam)"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          {/* Tên lớp */}
          <div>
            <label htmlFor="input-class-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tên lớp
            </label>
            <input
              type="text"
              id="input-class-name"
              value={formData.className}
              onChange={(e) => handleChange('className', e.target.value)}
              placeholder="Nhập tên lớp (ví dụ: 10A1, 11B2...)"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          {/* Năm học */}
          <div>
            <label htmlFor="input-school-year" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Năm học
            </label>
            <input
              type="text"
              id="input-school-year"
              value={formData.schoolYear}
              onChange={(e) => handleChange('schoolYear', e.target.value)}
              placeholder="Nhập năm học (ví dụ: 2026-2027)"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          {/* Giáo viên chủ nhiệm */}
          <div>
            <label htmlFor="input-homeroom-teacher" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Giáo viên chủ nhiệm
            </label>
            <input
              type="text"
              id="input-homeroom-teacher"
              value={formData.homeroomTeacher}
              onChange={(e) => handleChange('homeroomTeacher', e.target.value)}
              placeholder="Nhập họ và tên giáo viên chủ nhiệm"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          {/* Buttons: LƯU THÔNG TIN, HỦY */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              id="btn-save-class-info"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'ĐANG LƯU...' : 'LƯU THÔNG TIN'}</span>
            </button>

            <button
              type="button"
              id="btn-cancel-class-info"
              onClick={handleCancel}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>HỦY</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backup & Tools Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">SAO LƯU & QUẢN TRỊ DỮ LIỆU</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xuất dữ liệu dự phòng ra máy tính hoặc nạp dữ liệu mẫu thử nghiệm
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export JSON */}
            <button
              type="button"
              id="btn-export-backup-json"
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Xuất sao lưu lớp (JSON)</span>
            </button>

            {/* Import JSON */}
            <label
              id="btn-import-backup-label"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Khôi phục từ file JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
                id="file-input-backup-json"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Load sample data button */}
            <button
              type="button"
              id="btn-load-sample-data"
              onClick={handleLoadSampleData}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Tạo nhanh dữ liệu mẫu để thử nghiệm</span>
            </button>

            {/* Reset data */}
            <button
              type="button"
              id="btn-reset-to-empty"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Đặt lại về lớp trống</span>
            </button>
          </div>
        </div>
      </div>

      {/* FIREBASE REALTIME / CLOUD DATABASE SYNC */}
      <div id="section-firebase-sync" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Đồng bộ cơ sở dữ liệu Firebase Realtime & Firestore
              </h2>
              <p className="text-xs text-slate-500">
                Lưu trữ dữ liệu đám mây trực tuyến thay vì chỉ lưu trên LocalStorage thiết bị
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFbActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Đã kết nối ({fbConfig.projectId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Chưa kết nối Cloud (Lưu LocalStorage)
              </span>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Action buttons if connected */}
          {isFbActive && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Trạng thái đồng bộ đám mây</span>
                <span className="text-xs text-emerald-700">Dữ liệu có thể được sao lưu lên hoặc tải từ máy chủ Firebase bất cứ lúc nào.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-sync-to-firebase"
                  onClick={handleSyncToFirebase}
                  disabled={isSyncingFb}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{isSyncingFb ? 'Đang tải lên...' : 'Đồng bộ lên Firebase ngay'}</span>
                </button>
                <button
                  type="button"
                  id="btn-fetch-from-firebase"
                  onClick={handleFetchFromFirebase}
                  disabled={isFetchingFb}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>{isFetchingFb ? 'Đang tải về...' : 'Tải dữ liệu từ Firebase về'}</span>
                </button>
                <button
                  type="button"
                  id="btn-disconnect-firebase"
                  onClick={handleDisconnectFirebase}
                  className="px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium cursor-pointer"
                >
                  Hủy kết nối
                </button>
              </div>
            </div>
          )}

          {/* Quick Paste config section */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dán đoạn mã cấu hình Firebase (Tùy chọn tiện lợi):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='Dán đoạn const firebaseConfig = { apiKey: "...", projectId: "..." } vào đây'
                value={rawConfigPaste}
                onChange={(e) => handleParseSnippet(e.target.value)}
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleParseSnippet(rawConfigPaste)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 cursor-pointer"
              >
                Trích xuất
              </button>
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                API Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-fb-api-key"
                placeholder="AIzaSy..."
                value={fbConfig.apiKey}
                onChange={(e) => setFbConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-fb-project-id"
                placeholder="gvcn-360-xxxx"
                value={fbConfig.projectId}
                onChange={(e) => setFbConfig(prev => ({ ...prev, projectId: e.target.value }))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Realtime Database URL (Nếu dùng Realtime DB)
              </label>
              <input
                type="text"
                id="input-fb-database-url"
                placeholder="https://gvcn-360-default-rtdb.firebaseio.com"
                value={fbConfig.databaseURL || ''}
                onChange={(e) => setFbConfig(prev => ({ ...prev, databaseURL: e.target.value }))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                App ID
              </label>
              <input
                type="text"
                id="input-fb-app-id"
                placeholder="1:123456789:web:abcdef..."
                value={fbConfig.appId || ''}
                onChange={(e) => setFbConfig(prev => ({ ...prev, appId: e.target.value }))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Test and Save Button */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowFbGuide(!showFbGuide)}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              <span>{showFbGuide ? 'Ẩn hướng dẫn cài đặt' : 'Xem hướng dẫn chi tiết từng bước thiết lập Firebase'}</span>
              {showFbGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              id="btn-save-fb-config"
              onClick={handleSaveAndTestFirebase}
              disabled={isTestingFb}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{isTestingFb ? 'Đang kiểm tra kết nối...' : 'KIỂM TRA & LƯU KẾT NỐI FIREBASE'}</span>
            </button>
          </div>

          {/* DETAILED 5-STEP FIREBASE GUIDE */}
          {showFbGuide && (
            <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                HƯỚNG DẪN CHI TIẾT TỪNG BƯỚC TẠO FIREBASE MIỄN PHÍ:
              </h3>

              <ol className="space-y-3 list-decimal list-inside text-slate-700 leading-relaxed font-normal">
                <li className="pl-1">
                  <strong>Truy cập Firebase Console:</strong> Mở trình duyệt vào trang{' '}
                  <a 
                    href="https://console.firebase.google.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-indigo-600 font-bold inline-flex items-center gap-1 hover:underline"
                  >
                    console.firebase.google.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  và đăng nhập bằng tài khoản Google của bạn.
                </li>

                <li className="pl-1">
                  <strong>Tạo dự án mới:</strong> Nhấn nút <strong>"Add project" (Thêm dự án)</strong>. Đặt tên dự án (ví dụ: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">gvcn-lop10a1</code>), nhấn Tiếp tục. Ở bước Google Analytics, bạn có thể tắt hoặc bật tùy ý rồi bấm <strong>Create Project</strong>.
                </li>

                <li className="pl-1">
                  <strong>Đăng ký ứng dụng Web:</strong> Tại màn hình chính của dự án, bấm vào biểu tượng Web <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">&lt;/&gt;</code>. Đặt biệt danh (Nickname) là <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">GVCN 360</code> và bấm <strong>Register app</strong>. Bạn sẽ thấy đoạn mã <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">const firebaseConfig = &#123; ... &#125;</code>.
                </li>

                <li className="pl-1">
                  <strong>Kích hoạt cơ sở dữ liệu:</strong>
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-600">
                    <li>Ở thanh menu bên trái, chọn <strong>Build &gt; Firestore Database</strong> (hoặc <strong>Realtime Database</strong>).</li>
                    <li>Bấm nút <strong>Create database (Tạo cơ sở dữ liệu)</strong>, chọn vị trí gần bạn nhất (ví dụ: <code className="bg-slate-200 px-1 rounded font-mono">asia-southeast1</code>).</li>
                    <li>Ở bước Security Rules, chọn <strong>Start in test mode (Bắt đầu ở chế độ thử nghiệm)</strong> để cấp quyền đọc/ghi cho ứng dụng, rồi bấm <strong>Enable</strong>.</li>
                  </ul>
                </li>

                <li className="pl-1">
                  <strong>Kết nối vào app:</strong> Sao chép đoạn mã <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">firebaseConfig</code> ở bước 3, dán vào ô "Dán đoạn mã cấu hình Firebase" ở trên rồi bấm <strong>Trích xuất</strong> (hoặc tự điền <code className="bg-slate-200 px-1 rounded font-mono">apiKey</code> và <code className="bg-slate-200 px-1 rounded font-mono">projectId</code>), sau đó nhấn <strong>"Kiểm tra & Lưu kết nối"</strong>.
                </li>
              </ol>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                💡 <strong>Lợi ích:</strong> Khi kích hoạt Firebase, bạn có thể truy cập app từ nhiều thiết bị khác nhau (máy tính trường, điện thoại, máy tính ở nhà) mà không lo mất dữ liệu khi xóa lịch sử trình duyệt!
              </div>
            </div>
          )}
        </div>
      </div>
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận đặt lại dữ liệu?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Hành động này sẽ xóa toàn bộ danh sách học sinh, bảng điểm và điểm danh hiện tại trên thiết bị để trở về lớp trống ban đầu.
            </p>
            <div className="flex justify-end gap-3">
              <button
                id="btn-cancel-reset"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                id="btn-confirm-reset"
                onClick={handleResetToEmpty}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                XÓA TẤT CẢ VỀ LỚP TRỐNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
