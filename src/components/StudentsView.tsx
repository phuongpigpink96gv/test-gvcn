import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Check, 
  X, 
  Bus, 
  Utensils, 
  Phone, 
  Calendar,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { Student, AttendanceSession, AssessmentBatch, DisciplineRecord } from '../types';
import { generateId, generateToken, saveStudents } from '../storage';
import { parseStudentsExcelFile, downloadStudentTemplate } from '../utils/excel';
import { Modal } from './Modal';

interface StudentsViewProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  attendance: AttendanceSession[];
  assessments: AssessmentBatch[];
  discipline: DisciplineRecord[];
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onUpdateStudents,
  onShowToast,
  attendance,
  assessments,
  discipline,
}) => {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Nam' | 'Nữ'>('all');
  const [boarderFilter, setBoarderFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [busFilter, setBusFilter] = useState<'all' | 'yes' | 'no'>('all');

  // Add/Edit Student Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    gender: 'Nam' as 'Nam' | 'Nữ' | '',
    fatherPhone: '',
    motherPhone: '',
    boarder: false,
    bus: false,
    busNumber: '',
    busStop: '',
  });

  // Delete Modals
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Excel Import Preview Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelPreviewStudents, setExcelPreviewStudents] = useState<Partial<Student>[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Student Details Modal
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.fatherPhone.includes(searchTerm) ||
        s.motherPhone.includes(searchTerm);
      
      const matchGender = genderFilter === 'all' || s.gender === genderFilter;
      const matchBoarder = boarderFilter === 'all' || (boarderFilter === 'yes' ? s.boarder : !s.boarder);
      const matchBus = busFilter === 'all' || (busFilter === 'yes' ? s.bus : !s.bus);

      return matchSearch && matchGender && matchBoarder && matchBus;
    });
  }, [students, searchTerm, genderFilter, boarderFilter, busFilter]);

  // Open Form for Adding New Student
  const handleOpenAddForm = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '',
      birthDate: '',
      gender: 'Nam',
      fatherPhone: '',
      motherPhone: '',
      boarder: false,
      bus: false,
      busNumber: '',
      busStop: '',
    });
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Student
  const handleOpenEditForm = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      birthDate: student.birthDate,
      gender: student.gender || 'Nam',
      fatherPhone: student.fatherPhone,
      motherPhone: student.motherPhone,
      boarder: student.boarder,
      bus: student.bus,
      busNumber: student.busNumber,
      busStop: student.busStop,
    });
    setIsFormOpen(true);
  };

  // Save Student (Add or Edit)
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      onShowToast('Vui lòng nhập họ và tên học sinh', 'error');
      return;
    }

    let updated: Student[];
    if (editingStudent) {
      updated = students.map(s => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            fullName: formData.fullName.trim(),
            birthDate: formData.birthDate.trim(),
            gender: formData.gender,
            fatherPhone: formData.fatherPhone.trim(),
            motherPhone: formData.motherPhone.trim(),
            boarder: formData.boarder,
            bus: formData.bus,
            busNumber: formData.busNumber.trim(),
            busStop: formData.busStop.trim(),
          };
        }
        return s;
      });
      onShowToast(`Đã cập nhật thông tin học sinh ${formData.fullName}`, 'success');
    } else {
      const newStudent: Student = {
        id: generateId('stu'),
        fullName: formData.fullName.trim(),
        birthDate: formData.birthDate.trim(),
        gender: formData.gender,
        fatherPhone: formData.fatherPhone.trim(),
        motherPhone: formData.motherPhone.trim(),
        boarder: formData.boarder,
        bus: formData.bus,
        busNumber: formData.busNumber.trim(),
        busStop: formData.busStop.trim(),
        parentToken: generateToken(),
        createdAt: Date.now(),
      };
      updated = [...students, newStudent];
      onShowToast(`Đã thêm học sinh ${formData.fullName}`, 'success');
    }

    saveStudents(updated);
    onUpdateStudents(updated);
    setIsFormOpen(false);
  };

  // Confirm Single Delete
  const handleConfirmDeleteSingle = () => {
    if (!studentToDelete) return;
    const updated = students.filter(s => s.id !== studentToDelete.id);
    saveStudents(updated);
    onUpdateStudents(updated);
    onShowToast(`Đã xóa học sinh ${studentToDelete.fullName}`, 'info');
    setStudentToDelete(null);
  };

  // Confirm Delete All
  const handleConfirmDeleteAll = () => {
    saveStudents([]);
    onUpdateStudents([]);
    onShowToast('Đã xóa toàn bộ danh sách học sinh', 'info');
    setShowDeleteAllModal(false);
  };

  // Handle Excel File Selected
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setImportFileName(file.name);

    try {
      const parsed = await parseStudentsExcelFile(file);
      if (parsed.length === 0) {
        onShowToast('Không tìm thấy học sinh nào trong file Excel', 'error');
        return;
      }
      setExcelPreviewStudents(parsed);
      setIsImportModalOpen(true);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Lỗi khi đọc file Excel', 'error');
    } finally {
      setIsParsingFile(false);
      e.target.value = '';
    }
  };

  // Confirm Import from Excel
  const handleConfirmImportExcel = () => {
    const newStudents: Student[] = excelPreviewStudents.map(p => ({
      id: p.id || generateId('stu'),
      fullName: p.fullName || 'Chưa có tên',
      birthDate: p.birthDate || '',
      gender: p.gender || '',
      fatherPhone: p.fatherPhone || '',
      motherPhone: p.motherPhone || '',
      boarder: !!p.boarder,
      bus: !!p.bus,
      busNumber: p.busNumber || '',
      busStop: p.busStop || '',
      parentToken: p.parentToken || generateToken(),
      createdAt: Date.now(),
    }));

    const combined = [...students, ...newStudents];
    saveStudents(combined);
    onUpdateStudents(combined);
    setIsImportModalOpen(false);
    setExcelPreviewStudents([]);
    onShowToast(`Đã nhập thành công ${newStudents.length} học sinh từ Excel!`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Danh sách Học sinh
            <span className="text-sm font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {students.length} học sinh
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý lý lịch, bán trú, tuyến xe bus và phụ huynh liên lạc
          </p>
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* + THÊM HỌC SINH */}
          <button
            type="button"
            id="btn-add-student-main"
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ THÊM HỌC SINH</span>
          </button>

          {/* 📎 NHẬP FILE EXCEL */}
          <label
            id="btn-import-excel-label"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isParsingFile ? 'Đang đọc...' : '📎 NHẬP FILE EXCEL'}</span>
            <input
              type="file"
              id="file-input-students-excel"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelFileChange}
              disabled={isParsingFile}
              className="hidden"
            />
          </label>

          {/* TẢI FILE MẪU */}
          <button
            type="button"
            id="btn-download-student-template"
            onClick={downloadStudentTemplate}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Tải file Excel mẫu chuẩn"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Tải mẫu</span>
          </button>

          {/* XÓA TẤT CẢ (chỉ hiện khi có học sinh) */}
          {students.length > 0 && (
            <button
              type="button"
              id="btn-delete-all-students"
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-rose-200"
              title="Xóa tất cả học sinh"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>XÓA TẤT CẢ</span>
            </button>
          )}
        </div>
      </div>

      {/* When Empty: Requirement 6 */}
      {students.length === 0 ? (
        <div 
          id="students-empty-state"
          className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-2xl mx-auto my-8 shadow-xs"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Chưa có học sinh</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Lớp học hiện tại đang trống. Bạn có thể thêm từng học sinh thủ công hoặc nhập danh sách học sinh nhanh từ file Excel.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="btn-empty-add-student"
              onClick={handleOpenAddForm}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ THÊM HỌC SINH</span>
            </button>

            <label
              id="btn-empty-import-excel"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📎 NHẬP FILE EXCEL</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileChange}
                disabled={isParsingFile}
                className="hidden"
              />
            </label>

            <button
              type="button"
              id="btn-empty-download-template"
              onClick={downloadStudentTemplate}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Tải file Excel mẫu</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-search-students"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên học sinh, số điện thoại..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Giới tính */}
              <select
                id="select-gender-filter"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                aria-label="Lọc theo giới tính"
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả giới tính</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>

              {/* Bán trú */}
              <select
                id="select-boarder-filter"
                value={boarderFilter}
                onChange={(e) => setBoarderFilter(e.target.value as any)}
                aria-label="Lọc theo bán trú"
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Bán trú: Tất cả</option>
                <option value="yes">Bán trú: Có</option>
                <option value="no">Bán trú: Không</option>
              </select>

              {/* Xe bus */}
              <select
                id="select-bus-filter"
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value as any)}
                aria-label="Lọc theo xe bus"
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Xe bus: Tất cả</option>
                <option value="yes">Xe bus: Có</option>
                <option value="no">Xe bus: Không</option>
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">STT</th>
                    <th className="px-4 py-3.5">Họ và tên</th>
                    <th className="px-4 py-3.5">Ngày sinh</th>
                    <th className="px-4 py-3.5">Giới tính</th>
                    <th className="px-4 py-3.5">SĐT Cha / Mẹ</th>
                    <th className="px-4 py-3.5 text-center">Bán trú</th>
                    <th className="px-4 py-3.5 text-center">Xe bus</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-sm">
                        Không tìm thấy học sinh nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <tr 
                        key={student.id} 
                        id={`student-row-${student.id}`}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="hover:text-indigo-600 hover:underline text-left cursor-pointer"
                          >
                            {student.fullName}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          {student.birthDate || '—'}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {student.gender ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              student.gender === 'Nam' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                            }`}>
                              {student.gender}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {student.fatherPhone && <div>Bố: {student.fatherPhone}</div>}
                          {student.motherPhone && <div>Mẹ: {student.motherPhone}</div>}
                          {!student.fatherPhone && !student.motherPhone && '—'}
                        </td>
                        {/* Requirement 11: Bán trú Có / Không */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {student.boarder ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Có
                            </span>
                          ) : (
                            <span className="inline-block text-xs text-slate-400 font-medium">
                              Không
                            </span>
                          )}
                        </td>
                        {/* Requirement 11: Xe bus Có / Không */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {student.bus ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                                <Bus className="w-3 h-3 text-indigo-600" />
                                Có
                              </span>
                              {student.busNumber && (
                                <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {student.busNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block text-xs text-slate-400 font-medium">
                              Không
                            </span>
                          )}
                        </td>
                        {/* Thao tác */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`btn-view-student-${student.id}`}
                              onClick={() => setViewingStudent(student)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              id={`btn-edit-student-${student.id}`}
                              onClick={() => handleOpenEditForm(student)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Sửa thông tin"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              id={`btn-delete-student-${student.id}`}
                              onClick={() => setStudentToDelete(student)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: ADD / EDIT STUDENT (Requirement 7) */}
      <Modal
        id="modal-student-form"
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingStudent ? 'Sửa thông tin học sinh' : 'Thêm học sinh mới'}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-student-fullname"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Ví dụ: Nguyễn Văn An"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Ngày sinh & Giới tính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ngày sinh
              </label>
              <input
                type="text"
                id="input-student-dob"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                placeholder="YYYY-MM-DD hoặc DD/MM/YYYY"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Giới tính
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="student-gender"
                    checked={formData.gender === 'Nam'}
                    onChange={() => setFormData({ ...formData, gender: 'Nam' })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Nam</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="student-gender"
                    checked={formData.gender === 'Nữ'}
                    onChange={() => setFormData({ ...formData, gender: 'Nữ' })}
                    className="text-pink-600 focus:ring-pink-500"
                  />
                  <span>Nữ</span>
                </label>
              </div>
            </div>
          </div>

          {/* SĐT Cha & SĐT Mẹ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                SĐT cha
              </label>
              <input
                type="text"
                id="input-student-father-phone"
                value={formData.fatherPhone}
                onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                placeholder="Số điện thoại của bố"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                SĐT mẹ
              </label>
              <input
                type="text"
                id="input-student-mother-phone"
                value={formData.motherPhone}
                onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                placeholder="Số điện thoại của mẹ"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Bán trú & Xe bus Checkboxes */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-800">Bán trú (Ăn trưa tại trường)</span>
                <p className="text-xs text-slate-500">Đăng ký ăn trưa và nghỉ trưa tại trường</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="checkbox-student-boarder"
                  checked={formData.boarder}
                  onChange={(e) => setFormData({ ...formData, boarder: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm font-medium text-slate-700">
                  {formData.boarder ? 'Có' : 'Không'}
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-slate-800">Đi xe bus đưa đón</span>
                  <p className="text-xs text-slate-500">Đăng ký tuyến xe bus của nhà trường</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="checkbox-student-bus"
                    checked={formData.bus}
                    onChange={(e) => setFormData({ ...formData, bus: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm font-medium text-slate-700">
                    {formData.bus ? 'Có' : 'Không'}
                  </span>
                </label>
              </div>

              {/* Tuyến bus chi tiết nếu có */}
              {formData.bus && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Số xe / Tuyến xe
                    </label>
                    <input
                      type="text"
                      id="input-student-bus-num"
                      value={formData.busNumber}
                      onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                      placeholder="Ví dụ: Tuyến 05"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Điểm đón
                    </label>
                    <input
                      type="text"
                      id="input-student-bus-stop"
                      value={formData.busStop}
                      onChange={(e) => setFormData({ ...formData, busStop: e.target.value })}
                      placeholder="Ví dụ: Ngã tư Kim Mã"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons: LƯU, HỦY */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-student-form"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              HỦY
            </button>
            <button
              type="submit"
              id="btn-save-student-form"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              LƯU
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: XÓA HỌC SINH (Requirement 8) */}
      {studentToDelete && (
        <div 
          id="modal-delete-student"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa học sinh</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc muốn xóa học sinh <strong className="text-slate-900">{studentToDelete.fullName}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                id="btn-cancel-delete-single"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                id="btn-confirm-delete-single"
                onClick={handleConfirmDeleteSingle}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                XÓA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: XÓA TẤT CẢ HỌC SINH (Requirement 9) */}
      {showDeleteAllModal && (
        <div 
          id="modal-delete-all-students"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa toàn bộ</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc muốn xóa toàn bộ danh sách học sinh?
            </p>
            <div className="flex justify-end gap-3">
              <button
                id="btn-cancel-delete-all"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                id="btn-confirm-delete-all"
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                XÓA TẤT CẢ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PREVIEW IMPORT EXCEL (Requirement 10 & 11) */}
      <Modal
        id="modal-excel-preview"
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Xem trước dữ liệu Excel: ${importFileName}`}
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Đã phát hiện <strong>{excelPreviewStudents.length}</strong> học sinh trong file. 
            Vui lòng kiểm tra lại thông tin Bán trú và Xe bus trước khi lưu vào danh sách lớp.
          </p>

          <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">STT</th>
                  <th className="px-3 py-2">Họ và tên</th>
                  <th className="px-3 py-2">Ngày sinh</th>
                  <th className="px-3 py-2">Giới tính</th>
                  <th className="px-3 py-2 text-center">Bán trú</th>
                  <th className="px-3 py-2 text-center">Xe bus</th>
                  <th className="px-3 py-2">Số xe / Điểm đón</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {excelPreviewStudents.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.fullName}</td>
                    <td className="px-3 py-2 text-slate-600">{item.birthDate || '—'}</td>
                    <td className="px-3 py-2">{item.gender || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.boarder ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-400'
                      }`}>
                        {item.boarder ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.bus ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400'
                      }`}>
                        {item.bus ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {item.bus ? `${item.busNumber || ''} ${item.busStop ? `(${item.busStop})` : ''}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              id="btn-cancel-import-excel"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
            >
              HỦY
            </button>
            <button
              id="btn-confirm-import-excel"
              onClick={handleConfirmImportExcel}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              XÁC NHẬN LƯU VÀO DANH SÁCH
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: STUDENT DETAIL VIEW */}
      {viewingStudent && (
        <Modal
          id="modal-view-student"
          isOpen={true}
          onClose={() => setViewingStudent(null)}
          title={`Hồ sơ học sinh: ${viewingStudent.fullName}`}
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Quick Profile Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Họ và tên</span>
                <span className="font-bold text-slate-900 text-sm">{viewingStudent.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Giới tính</span>
                <span className="font-semibold text-slate-800">{viewingStudent.gender || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Ngày sinh</span>
                <span className="font-semibold text-slate-800">{viewingStudent.birthDate || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">SĐT cha</span>
                <span className="font-semibold text-slate-800">{viewingStudent.fatherPhone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">SĐT mẹ</span>
                <span className="font-semibold text-slate-800">{viewingStudent.motherPhone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Chế độ sinh hoạt</span>
                <div className="flex gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    viewingStudent.boarder ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {viewingStudent.boarder ? 'Bán trú' : 'Không bán trú'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    viewingStudent.bus ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {viewingStudent.bus ? `Xe bus: ${viewingStudent.busNumber || 'Có'}` : 'Không bus'}
                  </span>
                </div>
              </div>
            </div>

            {/* Test Scores */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Điểm kiểm tra gần đây
              </h4>
              {assessments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có đợt kiểm tra nào.</p>
              ) : (
                <div className="space-y-2">
                  {assessments.map(batch => {
                    const studentScores = batch.scores[viewingStudent.id] || {};
                    return (
                      <div key={batch.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                        <div className="font-bold text-slate-800 flex justify-between mb-2">
                          <span>{batch.name}</span>
                          <span className="text-slate-400 font-normal">{batch.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {batch.columns.map(col => {
                            const val = studentScores[col.id];
                            return (
                              <div key={col.id} className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-xs">
                                <span className="text-slate-500 mr-1.5">{col.subject}:</span>
                                <strong className="text-indigo-600 font-bold text-sm">
                                  {val !== null && val !== undefined ? val : '—'}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close button */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                id="btn-close-view-student"
                onClick={() => setViewingStudent(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
