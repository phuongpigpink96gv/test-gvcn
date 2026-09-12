import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Minus, 
  Award, 
  History, 
  Sliders, 
  Trash2, 
  Edit, 
  Check, 
  AlertTriangle, 
  Save, 
  Calendar,
  X
} from 'lucide-react';
import { Student, DisciplineRecord, ViolationTemplate } from '../types';
import { generateId, saveDiscipline, saveViolationTemplates } from '../storage';
import { Modal } from './Modal';

interface DisciplineViewProps {
  students: Student[];
  discipline: DisciplineRecord[];
  templates: ViolationTemplate[];
  onUpdateDiscipline: (records: DisciplineRecord[]) => void;
  onUpdateTemplates: (templates: ViolationTemplate[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DisciplineView: React.FC<DisciplineViewProps> = ({
  students,
  discipline,
  templates,
  onUpdateDiscipline,
  onUpdateTemplates,
  onShowToast,
}) => {
  // Current month filter (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Quick Bonus/Penalty or Violation Form Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'violation' | 'achievement'>('violation');
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [recordTitle, setRecordTitle] = useState('');
  const [recordPoints, setRecordPoints] = useState<number>(-2);
  const [recordNote, setRecordNote] = useState('');

  // Templates Manager Modal State (Requirement 17)
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ViolationTemplate | null>(null);
  const [tplTitle, setTplTitle] = useState('');
  const [tplPoints, setTplPoints] = useState<number>(-2);
  const [tplType, setTplType] = useState<'violation' | 'achievement'>('violation');

  // Student History Modal State
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // Delete Record Confirm
  const [recordToDelete, setRecordToDelete] = useState<DisciplineRecord | null>(null);

  // Filter discipline records by selected month
  const monthlyRecords = useMemo(() => {
    return discipline.filter(r => r.date.startsWith(selectedMonth));
  }, [discipline, selectedMonth]);

  // Compute Conduct Score per Student (Base: 100) (Requirement 18)
  const studentConductStats = useMemo(() => {
    const stats: Record<string, {
      bonus: number;
      penalty: number;
      finalScore: number;
      rank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
    }> = {};

    students.forEach(s => {
      let bonus = 0;
      let penalty = 0;

      monthlyRecords.forEach(r => {
        if (r.studentId === s.id) {
          if (r.points > 0) bonus += r.points;
          else penalty += Math.abs(r.points);
        }
      });

      const finalScore = Math.max(0, Math.min(100, 100 + bonus - penalty));
      let rank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' = 'Chưa đạt';

      if (finalScore >= 90) rank = 'Tốt';
      else if (finalScore >= 80) rank = 'Khá';
      else if (finalScore >= 50) rank = 'Đạt';
      else rank = 'Chưa đạt';

      stats[s.id] = { bonus, penalty, finalScore, rank };
    });

    return stats;
  }, [students, monthlyRecords]);

  // Open Quick Modal: Add Violation or Achievement
  const handleOpenAddRecord = (mode: 'violation' | 'achievement', studentId?: string) => {
    if (students.length === 0) {
      onShowToast('Chưa có học sinh trong lớp. Vui lòng thêm học sinh trước.', 'error');
      return;
    }

    setModalMode(mode);
    setTargetStudentId(studentId || students[0]?.id || '');
    setRecordDate(new Date().toISOString().slice(0, 10));

    // Find first template of this type
    const defaultTpl = templates.find(t => t.type === mode);
    if (defaultTpl) {
      setRecordTitle(defaultTpl.title);
      setRecordPoints(defaultTpl.points);
    } else {
      setRecordTitle(mode === 'violation' ? 'Vi phạm nội quy' : 'Thành tích tuyên dương');
      setRecordPoints(mode === 'violation' ? -2 : 2);
    }

    setRecordNote('');
    setIsRecordModalOpen(true);
  };

  // Select a preset template in record modal
  const handleSelectTemplate = (t: ViolationTemplate) => {
    setRecordTitle(t.title);
    setRecordPoints(t.points);
  };

  // Save Record (Violation or Bonus)
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId) {
      onShowToast('Vui lòng chọn học sinh', 'error');
      return;
    }
    if (!recordTitle.trim()) {
      onShowToast('Vui lòng nhập nội dung', 'error');
      return;
    }

    const student = students.find(s => s.id === targetStudentId);

    const newRecord: DisciplineRecord = {
      id: generateId('disc'),
      studentId: targetStudentId,
      date: recordDate,
      type: modalMode,
      title: recordTitle.trim(),
      points: recordPoints,
      note: recordNote.trim(),
      createdAt: Date.now(),
    };

    const updated = [newRecord, ...discipline];
    saveDiscipline(updated);
    onUpdateDiscipline(updated);
    setIsRecordModalOpen(false);

    onShowToast(`Đã lưu ${modalMode === 'violation' ? 'vi phạm' : 'cộng điểm'} cho ${student?.fullName || 'học sinh'}!`, 'success');
  };

  // Delete Discipline Record
  const handleConfirmDeleteRecord = () => {
    if (!recordToDelete) return;
    const updated = discipline.filter(r => r.id !== recordToDelete.id);
    saveDiscipline(updated);
    onUpdateDiscipline(updated);
    onShowToast('Đã xóa bản ghi vi phạm / thi đua', 'info');
    setRecordToDelete(null);
  };

  // Save Template (Add or Edit)
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim()) {
      onShowToast('Vui lòng nhập tên mẫu vi phạm / khen thưởng', 'error');
      return;
    }

    let updated: ViolationTemplate[];
    if (editingTemplate) {
      updated = templates.map(t => {
        if (t.id === editingTemplate.id) {
          return {
            ...t,
            title: tplTitle.trim(),
            points: tplPoints,
            type: tplType,
          };
        }
        return t;
      });
      onShowToast('Đã cập nhật mẫu nhanh!', 'success');
    } else {
      const newTpl: ViolationTemplate = {
        id: generateId('tpl'),
        title: tplTitle.trim(),
        points: tplPoints,
        type: tplType,
      };
      updated = [...templates, newTpl];
      onShowToast('Đã thêm mẫu nhanh mới!', 'success');
    }

    saveViolationTemplates(updated);
    onUpdateTemplates(updated);
    setEditingTemplate(null);
    setTplTitle('');
    setTplPoints(-2);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    saveViolationTemplates(updated);
    onUpdateTemplates(updated);
    onShowToast('Đã xóa mẫu', 'info');
  };

  const getRankBadge = (rank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt') => {
    switch (rank) {
      case 'Tốt':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Tốt</span>;
      case 'Khá':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Khá</span>;
      case 'Đạt':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Đạt</span>;
      case 'Chưa đạt':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">Chưa đạt</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Vi phạm & Điểm thi đua tháng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gốc 100 điểm/tháng. Tự động xếp loại Tốt (90-100), Khá (80-89), Đạt (50-79), Chưa đạt (&lt;50)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* + THÊM VI PHẠM (Requirement 17) */}
          <button
            type="button"
            id="btn-add-violation"
            onClick={() => handleOpenAddRecord('violation')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
            <span>- TRỪ ĐIỂM VI PHẠM</span>
          </button>

          {/* + CỘNG ĐIỂM (Requirement 18) */}
          <button
            type="button"
            id="btn-add-achievement"
            onClick={() => handleOpenAddRecord('achievement')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ CỘNG ĐIỂM THI ĐUA</span>
          </button>

          {/* MẪU NHANH (Requirement 17) */}
          <button
            type="button"
            id="btn-manage-templates"
            onClick={() => setIsTemplateManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Quản lý danh sách mẫu vi phạm / điểm trừ"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Cài đặt mẫu</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase">Tháng tính thi đua:</span>
          <input
            type="month"
            id="input-conduct-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-indigo-700 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Gốc: <strong className="text-slate-800">100đ</strong></span>
          <span>•</span>
          <span>Tổng số lượt ghi nhận tháng: <strong className="text-slate-800">{monthlyRecords.length}</strong></span>
        </div>
      </div>

      {/* Conduct Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10 text-center">STT</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-3 py-3 text-center">Điểm gốc</th>
                <th className="px-3 py-3 text-center">Điểm trừ (-)</th>
                <th className="px-3 py-3 text-center">Điểm cộng (+)</th>
                <th className="px-3 py-3 text-center">Tổng điểm</th>
                <th className="px-3 py-3 text-center">Xếp loại</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Chưa có học sinh nào trong lớp.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const stat = studentConductStats[student.id] || { bonus: 0, penalty: 0, finalScore: 100, rank: 'Tốt' };

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {student.fullName}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500 font-medium">
                        100
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-rose-600">
                        {stat.penalty > 0 ? `-${stat.penalty}` : '0'}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-600">
                        {stat.bonus > 0 ? `+${stat.bonus}` : '0'}
                      </td>
                      <td className="px-3 py-3 text-center font-extrabold text-sm text-slate-900">
                        {stat.finalScore}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {getRankBadge(stat.rank)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút trừ điểm nhanh */}
                          <button
                            id={`btn-quick-minus-${student.id}`}
                            onClick={() => handleOpenAddRecord('violation', student.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Trừ điểm vi phạm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          {/* Nút cộng điểm nhanh */}
                          <button
                            id={`btn-quick-plus-${student.id}`}
                            onClick={() => handleOpenAddRecord('achievement', student.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Cộng điểm thi đua"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {/* Nút XEM LỊCH SỬ (Requirement 18) */}
                          <button
                            id={`btn-view-history-${student.id}`}
                            onClick={() => setSelectedStudentForHistory(student)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span>Lịch sử</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD VIOLATION OR ACHIEVEMENT RECORD */}
      <Modal
        id="modal-add-discipline"
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={modalMode === 'violation' ? 'Trừ điểm vi phạm nội quy' : 'Cộng điểm thi đua / Khen thưởng'}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          {/* Học sinh */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Học sinh <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-discipline-student"
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>

          {/* Ngày ghi nhận */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ngày ghi nhận
            </label>
            <input
              type="date"
              id="input-discipline-date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Chọn từ mẫu nhanh (Requirement 17) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Chọn nhanh từ danh sách mẫu
            </label>
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
              {templates
                .filter(t => t.type === modalMode)
                .map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{t.title}</span>
                    <strong className={t.points < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      ({t.points > 0 ? `+${t.points}` : t.points})
                    </strong>
                  </button>
                ))}
            </div>
          </div>

          {/* Tiêu đề / Nội dung */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nội dung chi tiết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-discipline-title"
              required
              value={recordTitle}
              onChange={(e) => setRecordTitle(e.target.value)}
              placeholder="Ví dụ: Đi học muộn 15 phút, Quên bài tập Toán..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Số điểm cộng / trừ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Số điểm {modalMode === 'violation' ? 'trừ (số âm, ví dụ -2)' : 'cộng (số dương, ví dụ +2)'}
            </label>
            <input
              type="number"
              id="input-discipline-points"
              required
              value={recordPoints}
              onChange={(e) => setRecordPoints(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Ghi chú thêm */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ghi chú thêm (tùy chọn)
            </label>
            <input
              type="text"
              id="input-discipline-note"
              value={recordNote}
              onChange={(e) => setRecordNote(e.target.value)}
              placeholder="Đã nhắc nhở lần 1, học sinh hứa khắc phục..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Buttons: LƯU, HỦY */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-discipline"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
            >
              HỦY
            </button>
            <button
              type="submit"
              id="btn-save-discipline"
              className={`px-6 py-2 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer ${
                modalMode === 'violation' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              LƯU {modalMode === 'violation' ? 'ĐIỂM TRỪ' : 'ĐIỂM CỘNG'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TEMPLATE MANAGER (Requirement 17: Thêm, Sửa, Xóa, Thay đổi điểm mẫu) */}
      <Modal
        id="modal-template-manager"
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        title="Quản lý danh mục mẫu vi phạm & thi đua"
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Add / Edit Form */}
          <form onSubmit={handleSaveTemplate} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {editingTemplate ? 'Sửa mẫu nhanh' : '+ Thêm mẫu vi phạm / khen thưởng mới'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên mẫu</label>
                <input
                  type="text"
                  required
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  placeholder="Ví dụ: Quên phù hiệu, Điểm 10..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Số điểm</label>
                <input
                  type="number"
                  required
                  value={tplPoints}
                  onChange={(e) => {
                    const p = parseInt(e.target.value) || 0;
                    setTplPoints(p);
                    if (p < 0) setTplType('violation');
                    else setTplType('achievement');
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tpl-type"
                    checked={tplType === 'violation'}
                    onChange={() => {
                      setTplType('violation');
                      if (tplPoints > 0) setTplPoints(-tplPoints);
                    }}
                  />
                  <span>Vi phạm (Điểm trừ)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tpl-type"
                    checked={tplType === 'achievement'}
                    onChange={() => {
                      setTplType('achievement');
                      if (tplPoints < 0) setTplPoints(Math.abs(tplPoints));
                    }}
                  />
                  <span>Khen thưởng (Điểm cộng)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                {editingTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setTplTitle('');
                      setTplPoints(-2);
                    }}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  type="submit"
                  id="btn-save-template-item"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingTemplate ? 'LƯU THAY ĐỔI' : 'LƯU MẪU'}
                </button>
              </div>
            </div>
          </form>

          {/* Current Templates List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách mẫu hiện tại ({templates.length})
            </h4>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {templates.map(t => (
                <div key={t.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{t.title}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      t.points < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {t.points > 0 ? `+${t.points}` : t.points} điểm
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTemplate(t);
                        setTplTitle(t.title);
                        setTplPoints(t.points);
                        setTplType(t.type);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-600 rounded cursor-pointer"
                      title="Sửa mẫu"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Xóa mẫu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsTemplateManagerOpen(false)}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: VIEW STUDENT HISTORY (Requirement 18) */}
      {selectedStudentForHistory && (
        <Modal
          id="modal-student-history"
          isOpen={true}
          onClose={() => setSelectedStudentForHistory(null)}
          title={`Lịch sử thi đua & vi phạm: ${selectedStudentForHistory.fullName}`}
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
              <span>Học sinh: <strong>{selectedStudentForHistory.fullName}</strong></span>
              <span>
                Điểm tháng {selectedMonth}:{' '}
                <strong className="text-indigo-600 text-sm">
                  {studentConductStats[selectedStudentForHistory.id]?.finalScore || 100} điểm
                </strong>
              </span>
            </div>

            {/* List of records for this student */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {discipline.filter(r => r.studentId === selectedStudentForHistory.id).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Chưa có lượt ghi nhận vi phạm hoặc khen thưởng nào cho học sinh này.
                </div>
              ) : (
                discipline
                  .filter(r => r.studentId === selectedStudentForHistory.id)
                  .map(r => (
                    <div key={r.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{r.title}</span>
                          <span className={`px-2 py-0.2 rounded font-bold text-[11px] ${
                            r.points < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {r.points > 0 ? `+${r.points}` : r.points}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {r.date} {r.note ? `— Ghi chú: ${r.note}` : ''}
                        </div>
                      </div>

                      <button
                        onClick={() => setRecordToDelete(r)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Xóa bản ghi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: CONFIRM DELETE RECORD */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa bản ghi?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc muốn xóa bản ghi "<strong>{recordToDelete.title}</strong>" ({recordToDelete.points > 0 ? `+${recordToDelete.points}` : recordToDelete.points} điểm)?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                onClick={handleConfirmDeleteRecord}
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
