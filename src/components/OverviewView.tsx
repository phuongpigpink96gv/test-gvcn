import React from 'react';
import { 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  ShieldAlert, 
  BookOpen, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Bus,
  Utensils,
  School
} from 'lucide-react';
import { ClassInfo, Student, AttendanceSession, AssessmentBatch, DisciplineRecord, ViewType } from '../types';

interface OverviewViewProps {
  classInfo: ClassInfo;
  students: Student[];
  attendance: AttendanceSession[];
  assessments: AssessmentBatch[];
  discipline: DisciplineRecord[];
  onNavigate?: (view: ViewType) => void;
  onTabChange?: (view: ViewType) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  classInfo,
  students,
  attendance,
  assessments,
  discipline,
  onNavigate,
  onTabChange,
}) => {
  const navigate = onNavigate || onTabChange || (() => {});

  // Student statistics
  const totalStudents = students.length;
  const maleCount = students.filter(s => s.gender === 'Nam').length;
  const femaleCount = students.filter(s => s.gender === 'Nữ').length;
  const boarderCount = students.filter(s => s.boarder).length;
  const busCount = students.filter(s => s.bus).length;

  // Latest attendance
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.find(s => s.date === todayStr) || attendance[0] || null;

  // Recent month violations
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const recentMonthRecords = discipline.filter(d => d.date.startsWith(currentMonthStr));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-200 border border-white/15">
              <School className="w-3.5 h-3.5" />
              <span>{classInfo.schoolName || 'Chưa thiết lập trường học'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Lớp {classInfo.className || '(Chưa đặt tên lớp)'}
            </h1>
            <p className="text-sm text-indigo-200 font-medium">
              {classInfo.schoolYear ? `Năm học ${classInfo.schoolYear}` : 'Năm học chưa cập nhật'} 
              {classInfo.homeroomTeacher ? ` • GVCN: ${classInfo.homeroomTeacher}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="btn-overview-nav-students"
              onClick={() => navigate('students')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Quản lý học sinh</span>
            </button>
            <button
              type="button"
              id="btn-overview-nav-attendance"
              onClick={() => navigate('attendance')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl border border-indigo-400/30 transition-all cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Điểm danh ngay</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <span className="text-xs text-indigo-200 uppercase font-bold block">Tổng sĩ số</span>
            <span className="text-2xl font-black text-white">{totalStudents} <span className="text-xs font-normal text-indigo-300">HS</span></span>
          </div>
          <div>
            <span className="text-xs text-indigo-200 uppercase font-bold block">Nam / Nữ</span>
            <span className="text-2xl font-black text-white">{maleCount} / {femaleCount}</span>
          </div>
          <div>
            <span className="text-xs text-indigo-200 uppercase font-bold block">Ăn bán trú</span>
            <span className="text-2xl font-black text-emerald-400">{boarderCount} <span className="text-xs font-normal text-indigo-300">HS</span></span>
          </div>
          <div>
            <span className="text-xs text-indigo-200 uppercase font-bold block">Đi xe bus</span>
            <span className="text-2xl font-black text-amber-300">{busCount} <span className="text-xs font-normal text-indigo-300">HS</span></span>
          </div>
        </div>
      </div>

      {/* Grid of Main Functional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Điểm danh & Chuyên cần */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Điểm danh & Chuyên cần</h3>
                  <p className="text-xs text-slate-500">Theo dõi chuyên cần, phép, không phép</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {attendance.length} phiên
              </span>
            </div>

            {todayAttendance ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Phiên gần nhất: {todayAttendance.date} ({todayAttendance.session === 'morning' ? 'Sáng' : 'Chiều'})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                    Có mặt: {Object.values(todayAttendance.records).filter(s => s === 'present').length}
                  </span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                    Phép: {Object.values(todayAttendance.records).filter(s => s === 'excused').length}
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                    Không phép: {Object.values(todayAttendance.records).filter(s => s === 'unexcused').length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                Chưa có dữ liệu điểm danh. Nhấn nút bên dưới để tạo phiên điểm danh mới.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('attendance')}
            className="flex items-center justify-between w-full px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <span>Mở sổ điểm danh</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Điểm kiểm tra */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Điểm kiểm tra nhiều môn</h3>
                  <p className="text-xs text-slate-500">Khảo sát, giữa kỳ, thi học kỳ & nhập Excel</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {assessments.length} đợt
              </span>
            </div>

            {assessments.length > 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 block">
                  Đợt gần nhất: {assessments[assessments.length - 1].name}
                </span>
                <p className="text-slate-500">
                  Bao gồm các môn: {assessments[assessments.length - 1].columns.map(c => c.subject).join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                Chưa có đợt kiểm tra nào. Bạn có thể tạo đợt hoặc gửi file Excel để nhập điểm.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('assessments')}
            className="flex items-center justify-between w-full px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <span>Quản lý điểm số</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Thi đua & Vi phạm */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thi đua & Vi phạm</h3>
                  <p className="text-xs text-slate-500">Gốc 100 điểm, xếp loại Tốt / Khá / Đạt</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Tháng {currentMonthStr}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
              <span className="text-slate-600">
                Tổng số lượt ghi nhận trong tháng: <strong>{recentMonthRecords.length}</strong>
              </span>
              <p className="text-slate-400 mt-1">
                Tất cả học sinh bắt đầu với 100 điểm ban đầu và tự động tính điểm theo từng tháng.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('discipline')}
            className="flex items-center justify-between w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <span>Xem bảng điểm thi đua</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 4: Sổ liên lạc phụ huynh */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sổ liên lạc Phụ huynh</h3>
                  <p className="text-xs text-slate-500">Link cá nhân hóa, bảo mật cho từng học sinh</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Bảo mật riêng
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs text-slate-600">
              <p>
                Phụ huynh chỉ xem được đúng thông tin và điểm số con mình. Giáo viên có thể gửi thông báo và thu hồi link bất cứ lúc nào.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('parent-portal')}
            className="flex items-center justify-between w-full px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <span>Quản lý link sổ liên lạc</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
