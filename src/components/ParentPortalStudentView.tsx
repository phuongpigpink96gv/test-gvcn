import React from 'react';
import { 
  School, 
  User, 
  CalendarCheck, 
  Award, 
  ShieldAlert, 
  FileSpreadsheet, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  Bus,
  Utensils,
  ArrowLeft
} from 'lucide-react';
import { Student, ClassInfo, AttendanceSession, AssessmentBatch, DisciplineRecord } from '../types';

interface ParentPortalStudentViewProps {
  student: Student;
  classInfo: ClassInfo;
  attendance: AttendanceSession[];
  assessments: AssessmentBatch[];
  discipline: DisciplineRecord[];
  onBackToTeacher?: () => void;
  isStandalone?: boolean;
}

export const ParentPortalStudentView: React.FC<ParentPortalStudentViewProps> = ({
  student,
  classInfo,
  attendance,
  assessments,
  discipline,
  onBackToTeacher,
  isStandalone = false,
}) => {
  // Compute student attendance summary
  let presentCount = 0;
  let excusedCount = 0;
  let unexcusedCount = 0;
  let lateCount = 0;

  attendance.forEach(session => {
    const st = session.records[student.id];
    if (st === 'present') presentCount++;
    else if (st === 'excused') excusedCount++;
    else if (st === 'unexcused') unexcusedCount++;
    else if (st === 'late') lateCount++;
  });

  // Compute monthly conduct score for current month
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthlyDiscipline = discipline.filter(
    d => d.studentId === student.id && d.date.startsWith(currentMonthStr)
  );

  let bonus = 0;
  let penalty = 0;
  monthlyDiscipline.forEach(d => {
    if (d.points > 0) bonus += d.points;
    else penalty += Math.abs(d.points);
  });

  const conductScore = Math.max(0, Math.min(100, 100 + bonus - penalty));
  let conductRank = 'Tốt';
  let conductBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';

  if (conductScore >= 90) {
    conductRank = 'Tốt';
    conductBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (conductScore >= 80) {
    conductRank = 'Khá';
    conductBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (conductScore >= 50) {
    conductRank = 'Đạt';
    conductBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
  } else {
    conductRank = 'Chưa đạt';
    conductBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide uppercase mb-2 border border-white/15">
                <School className="w-3.5 h-3.5" />
                <span>Sổ liên lạc điện tử</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {classInfo.schoolName || 'Cổng thông tin phụ huynh'}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                Lớp {classInfo.className || '—'} {classInfo.schoolYear ? `• Năm học ${classInfo.schoolYear}` : ''}
                {classInfo.homeroomTeacher ? ` • GVCN: ${classInfo.homeroomTeacher}` : ''}
              </p>
            </div>

            {onBackToTeacher && (
              <button
                type="button"
                id="btn-parent-back-to-teacher"
                onClick={onBackToTeacher}
                className="self-start sm:self-center flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Về trang Giáo viên</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Student Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-2xl">
                {student.fullName.charAt(0)}
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Học sinh</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {student.fullName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>Giới tính: <strong className="text-slate-700">{student.gender || '—'}</strong></span>
                </div>
              </div>
            </div>

            {/* Badges for Boarder & Bus */}
            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                student.boarder ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {student.boarder ? 'Ăn bán trú tại trường' : 'Không bán trú'}
              </span>

              {student.bus && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5" />
                  <span>Xe bus: {student.busNumber || 'Có xe'} {student.busStop ? `(${student.busStop})` : ''}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Homeroom Teacher Announcement */}
        {classInfo.announcement && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1.5">
              <Bell className="w-4 h-4 text-amber-700" />
              <span>THÔNG BÁO TỪ GIÁO VIÊN CHỦ NHIỆM</span>
            </div>
            <p className="text-sm text-amber-950 font-medium whitespace-pre-line leading-relaxed">
              {classInfo.announcement}
            </p>
          </div>
        )}

        {/* SECTION: ĐIỂM KIỂM TRA (CRITICAL REQUIREMENT #16 - BIG, CLEAR, CRISP SCORES) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                KẾT QUẢ ĐIỂM KIỂM TRA
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {assessments.length} đợt khảo sát
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {assessments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Chưa có dữ liệu điểm kiểm tra nào được cập nhật.
              </p>
            ) : (
              <div className="space-y-6">
                {assessments.map(batch => {
                  const studentScores = batch.scores[student.id] || {};

                  return (
                    <div 
                      key={batch.id} 
                      className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                    >
                      {/* Batch Header: Name & Date */}
                      <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-sm sm:text-base uppercase tracking-wide">
                          {batch.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Ngày kiểm tra: {batch.date}
                        </span>
                      </div>

                      {/* Requirement 16: Big, Clear, High-Contrast Grade Cards */}
                      <div className="p-4 sm:p-5 bg-white">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {batch.columns.map(col => {
                            const scoreVal = studentScores[col.id];
                            const hasScore = scoreVal !== null && scoreVal !== undefined;

                            let scoreColor = 'text-slate-800';
                            let scoreBg = 'bg-slate-50 border-slate-200';
                            if (hasScore) {
                              if (scoreVal >= 8.0) {
                                scoreColor = 'text-emerald-700';
                                scoreBg = 'bg-emerald-50/70 border-emerald-200';
                              } else if (scoreVal >= 6.5) {
                                scoreColor = 'text-blue-700';
                                scoreBg = 'bg-blue-50/70 border-blue-200';
                              } else if (scoreVal >= 5.0) {
                                scoreColor = 'text-amber-700';
                                scoreBg = 'bg-amber-50/70 border-amber-200';
                              } else {
                                scoreColor = 'text-rose-700';
                                scoreBg = 'bg-rose-50/70 border-rose-200';
                              }
                            }

                            return (
                              <div
                                key={col.id}
                                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border ${scoreBg} transition-all`}
                              >
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight text-center truncate max-w-full">
                                  {col.subject}
                                </span>
                                <span className={`text-2xl sm:text-3xl font-black mt-1 ${scoreColor} tracking-tight`}>
                                  {hasScore ? scoreVal : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION: ĐIỂM DANH & CHUYÊN CẦN */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                TÌNH HÌNH ĐIỂM DANH
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Tổng số phiên: {attendance.length}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Quick Metrics: Focus on absences & tardies */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                <span className="text-xs font-bold text-amber-800 uppercase block">Nghỉ có phép</span>
                <span className="text-2xl font-black text-amber-700">{excusedCount}</span>
              </div>
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-center">
                <span className="text-xs font-bold text-rose-800 uppercase block">Nghỉ không phép</span>
                <span className="text-2xl font-black text-rose-700">{unexcusedCount}</span>
              </div>
              <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl text-center">
                <span className="text-xs font-bold text-orange-800 uppercase block">Đi muộn</span>
                <span className="text-2xl font-black text-orange-700">{lateCount}</span>
              </div>
            </div>

            {/* Attendance Session Details - Display only absences and tardies */}
            {attendance.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Lịch sử vắng & đi muộn ({attendance.filter(s => s.records[student.id] && s.records[student.id] !== 'present').length}):
                </span>
                {attendance.filter(s => s.records[student.id] && s.records[student.id] !== 'present').length === 0 ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Học sinh đi học chuyên cần đầy đủ, không có ghi nhận buổi vắng hoặc đi muộn nào.</span>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {attendance
                      .filter(s => s.records[student.id] && s.records[student.id] !== 'present')
                      .slice(0, 15)
                      .map(s => {
                        const st = s.records[student.id];
                        return (
                          <div key={s.id} className="p-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800 mr-2">{s.date}</span>
                              <span className="text-slate-500 font-medium">({s.session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'})</span>
                              {s.note && <span className="text-slate-400 block text-[11px] mt-0.5">{s.note}</span>}
                            </div>
                            <div>
                              {st === 'excused' && <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Nghỉ phép</span>}
                              {st === 'unexcused' && <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Không phép</span>}
                              {st === 'late' && <span className="text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">Đi muộn</span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION: ĐIỂM THI ĐUA & RÈN LUYỆN */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                ĐIỂM THI ĐUA & RÈN LUYỆN THÁNG
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Xếp loại:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${conductBadgeClass}`}>
                {conductRank}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Big Score Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Điểm thi đua tháng hiện tại ({currentMonthStr}):
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">{conductScore}</span>
                  <span className="text-sm font-semibold text-slate-400">/ 100 điểm chuẩn</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="text-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-700 font-bold block">+{bonus}đ</span>
                  <span className="text-[10px] text-emerald-600">Thành tích</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-rose-700 font-bold block">-{penalty}đ</span>
                  <span className="text-[10px] text-rose-600">Vi phạm</span>
                </div>
              </div>
            </div>

            {/* List of violations / achievements */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Chi tiết ghi nhận trong tháng:
              </span>
              {monthlyDiscipline.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                  Học sinh thực hiện tốt các nội quy, không có vi phạm trong tháng này.
                </p>
              ) : (
                <div className="space-y-2">
                  {monthlyDiscipline.map(d => (
                    <div 
                      key={d.id} 
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        d.points < 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{d.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {d.date} {d.note ? `• Ghi chú: ${d.note}` : ''}
                        </div>
                      </div>
                      <span className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                        d.points < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {d.points > 0 ? `+${d.points}` : d.points}đ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-400 pt-4 pb-8">
          GVCN 360 MINI • Cổng thông tin liên lạc học đường trực tuyến
        </div>
      </div>
    </div>
  );
};
