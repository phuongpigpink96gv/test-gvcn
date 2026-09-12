import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  History, 
  Edit, 
  Trash2, 
  Save, 
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Student, AttendanceSession, AttendanceStatus } from '../types';
import { generateId, saveAttendance } from '../storage';
import { Modal } from './Modal';

interface AttendanceViewProps {
  students: Student[];
  attendance: AttendanceSession[];
  onUpdateAttendance: (sessions: AttendanceSession[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  attendance,
  onUpdateAttendance,
  onShowToast,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [sessionDate, setSessionDate] = useState(todayStr);
  const [sessionPeriod, setSessionPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [sessionNote, setSessionNote] = useState('');
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});

  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);
  const [viewingHistorySession, setViewingHistorySession] = useState<AttendanceSession | null>(null);

  // Open New Attendance Session Modal
  const handleOpenNewSession = () => {
    if (students.length === 0) {
      onShowToast('Chưa có học sinh nào trong lớp. Vui lòng thêm học sinh trước.', 'error');
      return;
    }

    setEditingSession(null);
    setSessionDate(todayStr);
    setSessionPeriod(new Date().getHours() >= 12 ? 'afternoon' : 'morning');
    setSessionNote('');

    // Default all students to present
    const defaultRecords: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      defaultRecords[s.id] = 'present';
    });
    setRecords(defaultRecords);
    setIsFormOpen(true);
  };

  // Open Edit Session Modal
  const handleOpenEditSession = (session: AttendanceSession) => {
    setEditingSession(session);
    setSessionDate(session.date);
    setSessionPeriod(session.session);
    setSessionNote(session.note || '');

    // Clone records, default missing students to present
    const cloned: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      cloned[s.id] = session.records[s.id] || 'present';
    });
    setRecords(cloned);
    setIsFormOpen(true);
  };

  // Quick mark all present
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      updated[s.id] = 'present';
    });
    setRecords(updated);
    onShowToast('Đã đánh dấu tất cả có mặt', 'info');
  };

  // Toggle status for a student
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  // Save Attendance Session
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionDate) {
      onShowToast('Vui lòng chọn ngày điểm danh', 'error');
      return;
    }

    if (students.length === 0) {
      onShowToast('Lớp chưa có học sinh nào để điểm danh', 'error');
      return;
    }

    // Ensure every student has a valid status, fallback to 'present'
    const completeRecords: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      completeRecords[s.id] = records[s.id] || 'present';
    });

    let updated: AttendanceSession[];

    if (editingSession) {
      updated = attendance.map(s => {
        if (s.id === editingSession.id) {
          return {
            ...s,
            date: sessionDate,
            session: sessionPeriod,
            note: sessionNote.trim(),
            records: completeRecords,
          };
        }
        return s;
      });
      onShowToast(`Đã cập nhật điểm danh ngày ${sessionDate}`, 'success');
    } else {
      const existingIndex = attendance.findIndex(
        s => s.date === sessionDate && s.session === sessionPeriod
      );
      if (existingIndex !== -1) {
        updated = attendance.map((s, idx) => {
          if (idx === existingIndex) {
            return {
              ...s,
              records: completeRecords,
              note: sessionNote.trim() || s.note,
            };
          }
          return s;
        });
        onShowToast(`Đã cập nhật lại điểm danh buổi ${sessionPeriod === 'morning' ? 'sáng' : 'chiều'} ngày ${sessionDate}`, 'success');
      } else {
        const newSession: AttendanceSession = {
          id: generateId('att'),
          date: sessionDate,
          session: sessionPeriod,
          records: completeRecords,
          note: sessionNote.trim(),
          createdAt: Date.now(),
        };
        // Prepend newest first
        updated = [newSession, ...attendance];
        onShowToast(`Đã lưu phiên điểm danh ngày ${sessionDate}`, 'success');
      }
    }

    try {
      saveAttendance(updated);
      onUpdateAttendance(updated);
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      onShowToast('Lỗi khi lưu điểm danh: ' + (err.message || ''), 'error');
    }
  };

  // Delete session
  const handleConfirmDeleteSession = () => {
    if (!sessionToDelete) return;
    const updated = attendance.filter(s => s.id !== sessionToDelete.id);
    saveAttendance(updated);
    onUpdateAttendance(updated);
    onShowToast('Đã xóa phiên điểm danh', 'info');
    setSessionToDelete(null);
  };

  // Helper to count statuses in a session
  const getSessionCounts = (session: AttendanceSession) => {
    let present = 0;
    let excused = 0;
    let unexcused = 0;
    let late = 0;

    Object.values(session.records).forEach(status => {
      if (status === 'present') present++;
      else if (status === 'excused') excused++;
      else if (status === 'unexcused') unexcused++;
      else if (status === 'late') late++;
    });

    return { present, excused, unexcused, late, total: Object.keys(session.records).length };
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"><CheckCircle className="w-3 h-3" /> Có mặt</span>;
      case 'excused':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200"><Clock className="w-3 h-3" /> Phép</span>;
      case 'unexcused':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200"><XCircle className="w-3 h-3" /> Không phép</span>;
      case 'late':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200"><AlertCircle className="w-3 h-3" /> Đi muộn</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
            Điểm danh Lớp học
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi chuyên cần từng buổi sáng/chiều, lý do vắng và đi muộn
          </p>
        </div>

        <button
          type="button"
          id="btn-open-attendance-modal"
          onClick={handleOpenNewSession}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ ĐIỂM DANH</span>
        </button>
      </div>

      {/* Attendance History List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Lịch sử các phiên điểm danh
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong>{attendance.length}</strong> phiên
          </span>
        </div>

        {attendance.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Chưa có phiên điểm danh nào được lưu.</p>
            <p className="text-xs text-slate-400 mt-1">Nhấn nút "+ ĐIỂM DANH" phía trên để tạo phiên điểm danh cho ngày hôm nay.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attendance.map((session) => {
              const counts = getSessionCounts(session);
              return (
                <div 
                  key={session.id} 
                  id={`attendance-session-${session.id}`}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900 text-base">
                        {session.date}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        session.session === 'morning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {session.session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}
                      </span>
                      {session.note && (
                        <span className="text-xs text-slate-500 italic hidden sm:inline">
                          — {session.note}
                        </span>
                      )}
                    </div>

                    {/* Summary Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                        Có mặt: <strong>{counts.present}</strong>
                      </span>
                      {counts.excused > 0 && (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                          Nghỉ phép: <strong>{counts.excused}</strong>
                        </span>
                      )}
                      {counts.unexcused > 0 && (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                          Không phép: <strong>{counts.unexcused}</strong>
                        </span>
                      )}
                      {counts.late > 0 && (
                        <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded font-medium">
                          Đi muộn: <strong>{counts.late}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      id={`btn-view-attendance-${session.id}`}
                      onClick={() => setViewingHistorySession(session)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Chi tiết
                    </button>
                    <button
                      id={`btn-edit-attendance-${session.id}`}
                      onClick={() => handleOpenEditSession(session)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Sửa điểm danh"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-attendance-${session.id}`}
                      onClick={() => setSessionToDelete(session)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa phiên"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE / EDIT ATTENDANCE (Requirement 12) */}
      <Modal
        id="modal-attendance-session"
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSession ? 'Sửa phiên điểm danh' : 'Tạo phiên điểm danh mới'}
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          {/* Header Controls: Date & Session */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ngày điểm danh
              </label>
              <input
                type="date"
                id="input-attendance-date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Buổi
              </label>
              <select
                id="select-attendance-period"
                value={sessionPeriod}
                onChange={(e) => setSessionPeriod(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="morning">Buổi sáng</option>
                <option value="afternoon">Buổi chiều</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ghi chú phiên
              </label>
              <input
                type="text"
                id="input-attendance-note"
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="Ví dụ: Trời mưa, kiểm tra đột xuất..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách học sinh ({students.length})
            </span>
            <button
              type="button"
              id="btn-mark-all-present"
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tất cả có mặt</span>
            </button>
          </div>

          {/* Student attendance list */}
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {students.map((student, idx) => {
              const currentStatus = records[student.id] || 'present';
              return (
                <div key={student.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 w-6">{idx + 1}.</span>
                    <div>
                      <span className="text-sm font-bold text-slate-800">{student.fullName}</span>
                      {student.boarder && (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded ml-2">Bán trú</span>
                      )}
                    </div>
                  </div>

                  {/* Status Options */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      id={`btn-status-present-${student.id}`}
                      onClick={() => handleSetStatus(student.id, 'present')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Có mặt
                    </button>
                    <button
                      type="button"
                      id={`btn-status-excused-${student.id}`}
                      onClick={() => handleSetStatus(student.id, 'excused')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'excused'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Nghỉ có phép
                    </button>
                    <button
                      type="button"
                      id={`btn-status-unexcused-${student.id}`}
                      onClick={() => handleSetStatus(student.id, 'unexcused')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'unexcused'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Nghỉ không phép
                    </button>
                    <button
                      type="button"
                      id={`btn-status-late-${student.id}`}
                      onClick={() => handleSetStatus(student.id, 'late')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'late'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Đi muộn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buttons: LƯU ĐIỂM DANH, HỦY */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-attendance"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              HỦY
            </button>
            <button
              type="submit"
              id="btn-save-attendance"
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>LƯU ĐIỂM DANH</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW DETAILS OF A SESSION */}
      {viewingHistorySession && (
        <Modal
          id="modal-view-attendance-session"
          isOpen={true}
          onClose={() => setViewingHistorySession(null)}
          title={`Chi tiết điểm danh ngày ${viewingHistorySession.date} (${viewingHistorySession.session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'})`}
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-4">
            {viewingHistorySession.note && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Ghi chú: {viewingHistorySession.note}
              </p>
            )}

            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {students.map((s, idx) => {
                const st = viewingHistorySession.records[s.id] || 'present';
                return (
                  <div key={s.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {s.fullName}
                    </span>
                    <div>{getStatusBadge(st)}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                id="btn-close-view-attendance"
                onClick={() => setViewingHistorySession(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: DELETE SESSION CONFIRM */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa phiên điểm danh?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc muốn xóa phiên điểm danh ngày <strong>{sessionToDelete.date}</strong> ({sessionToDelete.session === 'morning' ? 'Sáng' : 'Chiều'})?
            </p>
            <div className="flex justify-end gap-3">
              <button
                id="btn-cancel-delete-att"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                id="btn-confirm-delete-att"
                onClick={handleConfirmDeleteSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                XÓA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
