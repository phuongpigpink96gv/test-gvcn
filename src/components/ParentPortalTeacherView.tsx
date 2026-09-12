import React, { useState } from 'react';
import { 
  BookOpen, 
  Link as LinkIcon, 
  Copy, 
  RotateCcw, 
  Eye, 
  Save, 
  Check, 
  Bell, 
  ShieldAlert, 
  ExternalLink,
  QrCode,
  CheckCircle2
} from 'lucide-react';
import { Student, ClassInfo, AttendanceSession, AssessmentBatch, DisciplineRecord } from '../types';
import { generateToken, saveStudents, saveClassInfo } from '../storage';
import { Modal } from './Modal';
import { ParentPortalStudentView } from './ParentPortalStudentView';

interface ParentPortalTeacherViewProps {
  students: Student[];
  classInfo: ClassInfo;
  attendance: AttendanceSession[];
  assessments: AssessmentBatch[];
  discipline: DisciplineRecord[];
  onUpdateStudents: (students: Student[]) => void;
  onUpdateClassInfo: (info: ClassInfo) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentPortalTeacherView: React.FC<ParentPortalTeacherViewProps> = ({
  students,
  classInfo,
  attendance,
  assessments,
  discipline,
  onUpdateStudents,
  onUpdateClassInfo,
  onShowToast,
}) => {
  // Announcement input state
  const [announcementText, setAnnouncementText] = useState(classInfo.announcement || '');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Link & Copy state
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Preview Student Modal State (Requirement 19)
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  // Manual Copy Link Dialog (Fallback if clipboard API restricted)
  const [fallbackCopyLink, setFallbackCopyLink] = useState<{ studentName: string; url: string } | null>(null);

  // Save Homeroom Teacher Announcement
  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAnnouncement(true);

    const updated: ClassInfo = {
      ...classInfo,
      announcement: announcementText.trim(),
    };

    saveClassInfo(updated);
    onUpdateClassInfo(updated);
    setIsSavingAnnouncement(false);
    onShowToast('Đã lưu thông báo gửi phụ huynh thành công!', 'success');
  };

  // Helper to construct parent portal URL
  const getParentUrl = (token: string): string => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?portal=parent&token=${token}`;
  };

  // Requirement 20: TẠO LINK
  const handleGenerateLink = (student: Student) => {
    const newToken = generateToken();
    const updated = students.map(s => {
      if (s.id === student.id) {
        return { ...s, parentToken: newToken };
      }
      return s;
    });

    saveStudents(updated);
    onUpdateStudents(updated);
    onShowToast(`Đã tạo link sổ liên lạc mới cho học sinh ${student.fullName}!`, 'success');
  };

  // Requirement 20: SAO CHÉP LINK (Using real Clipboard API with fallback)
  const handleCopyLink = async (student: Student) => {
    const token = student.parentToken || generateToken();
    if (!student.parentToken) {
      // Auto assign if missing
      const updated = students.map(s => s.id === student.id ? { ...s, parentToken: token } : s);
      saveStudents(updated);
      onUpdateStudents(updated);
    }

    const url = getParentUrl(token);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedStudentId(student.id);
        onShowToast(`Đã sao chép link phụ huynh của ${student.fullName}!`, 'success');
        setTimeout(() => setCopiedStudentId(null), 3000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      // Fallback: show copy dialog
      setFallbackCopyLink({ studentName: student.fullName, url });
    }
  };

  // Requirement 21: THU HỒI LINK (Vô hiệu hóa link cũ)
  const handleRevokeLink = (student: Student) => {
    // Generate an entirely new random token so the old URL returns invalid!
    const newToken = generateToken();
    const updated = students.map(s => {
      if (s.id === student.id) {
        return { ...s, parentToken: newToken };
      }
      return s;
    });

    saveStudents(updated);
    onUpdateStudents(updated);
    onShowToast(`Đã thu hồi link cũ của ${student.fullName}. Link cũ không còn truy cập được!`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Sổ liên lạc điện tử Phụ huynh
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cấp link bảo mật riêng cho từng phụ huynh xem điểm thi, điểm danh và hạnh kiểm của con
          </p>
        </div>
      </div>

      {/* Homeroom Teacher Announcement Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <form onSubmit={handleSaveAnnouncement} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>THÔNG BÁO CHUNG CỦA GVCN GỬI PHỤ HUYNH</span>
            </div>
            <span className="text-xs text-slate-400">
              Xuất hiện đầu trang sổ liên lạc
            </span>
          </div>

          <textarea
            id="textarea-homeroom-announcement"
            rows={3}
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="Nhập thông báo gửi toàn thể phụ huynh (ví dụ: Kính gửi phụ huynh, tuần sau lớp sẽ kiểm tra giữa kỳ môn Toán và Ngữ văn...)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              id="btn-save-announcement"
              disabled={isSavingAnnouncement}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>LƯU THÔNG BÁO</span>
            </button>
          </div>
        </form>
      </div>

      {/* Student Parent Links Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Danh sách Link Phụ huynh ({students.length})
          </h2>
          <span className="text-xs text-slate-500">
            Mỗi học sinh có mã bí mật riêng biệt
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-medium text-slate-600">Chưa có học sinh nào trong lớp.</p>
            <p className="text-xs text-slate-400 mt-1">Vui lòng thêm học sinh ở tab "Học sinh" để tạo link sổ liên lạc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">STT</th>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-3 py-3">SĐT Phụ huynh</th>
                  <th className="px-3 py-3 text-center">Trạng thái Link</th>
                  <th className="px-4 py-3 text-right">Thao tác Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, idx) => {
                  const hasToken = Boolean(student.parentToken);
                  const isCopied = copiedStudentId === student.id;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {student.fullName}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {student.motherPhone || student.fatherPhone || '—'}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {hasToken ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Đã kích hoạt
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Chưa tạo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút SAO CHÉP LINK (Requirement 20) */}
                          <button
                            type="button"
                            id={`btn-copy-parent-link-${student.id}`}
                            onClick={() => handleCopyLink(student)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                            title="Sao chép link gửi cho phụ huynh"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'ĐÃ CHÉP' : 'SAO CHÉP LINK'}</span>
                          </button>

                          {/* Nút TẠO LINK / LÀM MỚI LINK (Requirement 20) */}
                          <button
                            type="button"
                            id={`btn-generate-parent-link-${student.id}`}
                            onClick={() => handleGenerateLink(student)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Tạo lại mã token mới"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Nút THU HỒI LINK (Requirement 21) */}
                          <button
                            type="button"
                            id={`btn-revoke-parent-link-${student.id}`}
                            onClick={() => handleRevokeLink(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Thu hồi link (Vô hiệu hóa link cũ)"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          {/* Nút XEM GIAO DIỆN PH (Requirement 19 & 16) */}
                          <button
                            type="button"
                            id={`btn-preview-parent-view-${student.id}`}
                            onClick={() => setPreviewStudent(student)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Xem trước giao diện Phụ huynh"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Xem thử</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: PREVIEW PARENT PORTAL (Requirement 19 & 16) */}
      {previewStudent && (
        <Modal
          id="modal-preview-parent-portal"
          isOpen={true}
          onClose={() => setPreviewStudent(null)}
          title={`Góc nhìn Phụ huynh học sinh: ${previewStudent.fullName}`}
          maxWidthClass="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span>
                Đây là giao diện thực tế mà phụ huynh của <strong>{previewStudent.fullName}</strong> sẽ nhìn thấy khi mở link.
              </span>
              <button
                type="button"
                onClick={() => handleCopyLink(previewStudent)}
                className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 rounded font-bold text-[11px] border border-amber-300"
              >
                <Copy className="w-3 h-3" />
                <span>Sao chép link này</span>
              </button>
            </div>

            {/* Render exact student view inside preview */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
              <ParentPortalStudentView
                student={previewStudent}
                classInfo={classInfo}
                attendance={attendance}
                assessments={assessments}
                discipline={discipline}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="btn-close-parent-preview-modal"
                onClick={() => setPreviewStudent(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                Đóng xem thử
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* FALLBACK MODAL: MANUAL COPY LINK */}
      {fallbackCopyLink && (
        <Modal
          id="modal-fallback-copy-link"
          isOpen={true}
          onClose={() => setFallbackCopyLink(null)}
          title={`Link sổ liên lạc của ${fallbackCopyLink.studentName}`}
          maxWidthClass="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Vui lòng sao chép link bên dưới để gửi cho phụ huynh qua Zalo hoặc tin nhắn:
            </p>

            <textarea
              readOnly
              value={fallbackCopyLink.url}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              rows={3}
              className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-800 select-all"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFallbackCopyLink(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                ĐÃ SAO CHÉP XONG
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
