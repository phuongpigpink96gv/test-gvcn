import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  Edit, 
  Eye, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  CheckSquare,
  Square,
  RefreshCw
} from 'lucide-react';
import { Student, AssessmentBatch, AssessmentColumn } from '../types';
import { generateId, saveAssessments } from '../storage';
import { parseGradesExcelFile, parseGradesWithAI, ParsedGradesResult, downloadGradesTemplate } from '../utils/excel';
import { Modal } from './Modal';

interface AssessmentsViewProps {
  students: Student[];
  assessments: AssessmentBatch[];
  onUpdateAssessments: (batches: AssessmentBatch[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  students,
  assessments,
  onUpdateAssessments,
  onShowToast,
}) => {
  // Active selected batch to view/edit scores
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    assessments[0]?.id || null
  );

  // Modal: Create New Batch
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDate, setNewBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBatchSubjects, setNewBatchSubjects] = useState<string[]>([
    'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học'
  ]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Modal: Excel Import Grades
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetBatchId, setImportTargetBatchId] = useState<string>('');
  const [excelImportData, setExcelImportData] = useState<ParsedGradesResult | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [currentGradesFile, setCurrentGradesFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false);

  // Confirm delete batch
  const [batchToDelete, setBatchToDelete] = useState<AssessmentBatch | null>(null);

  // In-line score editing state for selected batch
  const activeBatch = assessments.find(b => b.id === selectedBatchId) || assessments[0] || null;
  const [editingScores, setEditingScores] = useState<Record<string, Record<string, number | null>>>({});
  const [hasScoreChanges, setHasScoreChanges] = useState(false);

  // Sync editingScores when activeBatch changes
  React.useEffect(() => {
    if (activeBatch) {
      setEditingScores({ ...activeBatch.scores });
      setHasScoreChanges(false);
    }
  }, [activeBatch?.id]);

  // Handle Score Input Change
  const handleScoreCellChange = (studentId: string, colId: string, valueStr: string) => {
    const trimmed = valueStr.trim();
    let numVal: number | null = null;
    if (trimmed !== '' && trimmed !== '—' && trimmed !== '-') {
      const parsed = parseFloat(trimmed.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
        numVal = Math.round(parsed * 10) / 10;
      }
    }

    setEditingScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [colId]: numVal,
      },
    }));
    setHasScoreChanges(true);
  };

  // Save in-line score changes
  const handleSaveScoreTable = () => {
    if (!activeBatch) return;
    const updated = assessments.map(b => {
      if (b.id === activeBatch.id) {
        return {
          ...b,
          scores: editingScores,
        };
      }
      return b;
    });

    saveAssessments(updated);
    onUpdateAssessments(updated);
    setHasScoreChanges(false);
    onShowToast(`Đã lưu bảng điểm đợt "${activeBatch.name}"!`, 'success');
  };

  // Open Create Batch Modal
  const handleOpenNewBatch = () => {
    setNewBatchName('');
    setNewBatchDate(new Date().toISOString().slice(0, 10));
    setNewBatchSubjects(['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học']);
    setCustomSubjectInput('');
    setIsNewBatchModalOpen(true);
  };

  // Add subject tag to new batch
  const handleAddSubjectTag = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (newBatchSubjects.includes(trimmed)) {
      onShowToast('Môn học này đã có trong danh sách', 'error');
      return;
    }
    setNewBatchSubjects([...newBatchSubjects, trimmed]);
    setCustomSubjectInput('');
  };

  const handleRemoveSubjectTag = (sub: string) => {
    setNewBatchSubjects(newBatchSubjects.filter(s => s !== sub));
  };

  // Save New Batch (Requirement 14)
  const handleSaveNewBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      onShowToast('Vui lòng nhập tên đợt kiểm tra', 'error');
      return;
    }
    if (newBatchSubjects.length === 0) {
      onShowToast('Vui lòng thêm ít nhất 1 môn học cho đợt kiểm tra', 'error');
      return;
    }

    const columns: AssessmentColumn[] = newBatchSubjects.map(sub => ({
      id: generateId('col'),
      subject: sub,
      coefficient: 1,
    }));

    const newBatch: AssessmentBatch = {
      id: generateId('batch'),
      name: newBatchName.trim(),
      date: newBatchDate,
      columns,
      scores: {},
      createdAt: Date.now(),
    };

    const updated = [...assessments, newBatch];
    saveAssessments(updated);
    onUpdateAssessments(updated);
    setSelectedBatchId(newBatch.id);
    setIsNewBatchModalOpen(false);
    onShowToast(`Đã tạo đợt kiểm tra "${newBatch.name}" với ${columns.length} môn!`, 'success');
  };

  // Delete Batch
  const handleConfirmDeleteBatch = () => {
    if (!batchToDelete) return;
    const updated = assessments.filter(b => b.id !== batchToDelete.id);
    saveAssessments(updated);
    onUpdateAssessments(updated);
    if (selectedBatchId === batchToDelete.id) {
      setSelectedBatchId(updated[0]?.id || null);
    }
    onShowToast(`Đã xóa đợt kiểm tra "${batchToDelete.name}"`, 'info');
    setBatchToDelete(null);
  };

  // Run Scan on Excel File (Smart Rules or Gemini AI)
  const processGradesFile = async (file: File, useAI: boolean) => {
    if (students.length === 0) {
      onShowToast('Chưa có học sinh nào trong lớp để đối chiếu điểm.', 'error');
      return;
    }

    setCurrentGradesFile(file);
    if (useAI) {
      setIsAIScanning(true);
    } else {
      setIsParsing(true);
    }

    try {
      let parsed: ParsedGradesResult;
      if (useAI) {
        onShowToast('Đang dùng Google Gemini AI quét thông minh bảng điểm...', 'info');
        parsed = await parseGradesWithAI(file, students);
      } else {
        parsed = await parseGradesExcelFile(file, students);
      }

      setExcelImportData(parsed);
      setSelectedSubjects([...parsed.subjects]);
      setImportTargetBatchId(activeBatch?.id || assessments[0]?.id || 'create_new');
      setIsImportModalOpen(true);
      
      const matchedCount = parsed.results.filter(r => r.matched).length;
      onShowToast(`Đã nhận diện ${parsed.subjects.length} cột điểm • Khớp ${matchedCount}/${students.length} học sinh`, 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Lỗi khi đọc file Excel bảng điểm', 'error');
    } finally {
      setIsParsing(false);
      setIsAIScanning(false);
    }
  };

  // Standard File Upload change
  const handleExcelGradesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processGradesFile(file, false);
    e.target.value = '';
  };

  // Dedicated AI Scan File Upload change
  const handleAIGradesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processGradesFile(file, true);
    e.target.value = '';
  };

  // Re-scan with AI inside the preview modal
  const handleReScanWithAI = async () => {
    if (!currentGradesFile) {
      onShowToast('Vui lòng chọn lại file điểm để quét AI', 'error');
      return;
    }
    await processGradesFile(currentGradesFile, true);
  };

  // Toggle subject column selection
  const handleToggleSubject = (sub: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(sub)) {
        if (prev.length <= 1) {
          onShowToast('Phải giữ lại ít nhất 1 cột điểm', 'info');
          return prev;
        }
        return prev.filter(s => s !== sub);
      } else {
        return [...prev, sub];
      }
    });
  };

  // Select all / deselect all subjects
  const handleSelectAllSubjects = (selectAll: boolean) => {
    if (!excelImportData) return;
    if (selectAll) {
      setSelectedSubjects([...excelImportData.subjects]);
    } else {
      setSelectedSubjects(excelImportData.subjects.slice(0, 1));
    }
  };

  // Confirm Excel Grade Import
  const handleConfirmImportGrades = () => {
    if (!excelImportData) return;

    if (selectedSubjects.length === 0) {
      onShowToast('Vui lòng chọn ít nhất một cột điểm để lưu', 'error');
      return;
    }

    let targetBatch: AssessmentBatch | null = null;
    let isCreatingNew = importTargetBatchId === 'create_new' || !activeBatch;

    let updatedBatches = [...assessments];

    if (isCreatingNew) {
      // Create new batch from selected Excel columns
      const cols: AssessmentColumn[] = selectedSubjects.map(s => ({
        id: generateId('col'),
        subject: s,
        coefficient: 1,
      }));

      const newScores: Record<string, Record<string, number | null>> = {};
      excelImportData.results.forEach(res => {
        if (res.matched && res.studentId) {
          newScores[res.studentId] = {};
          cols.forEach(c => {
            const sc = res.scores[c.subject];
            newScores[res.studentId][c.id] = sc !== undefined ? sc : null;
          });
        }
      });

      const newBatch: AssessmentBatch = {
        id: generateId('batch'),
        name: `Đợt kiểm tra Excel (${new Date().toLocaleDateString('vi-VN')})`,
        date: new Date().toISOString().slice(0, 10),
        columns: cols,
        scores: newScores,
        createdAt: Date.now(),
      };

      updatedBatches.push(newBatch);
      setSelectedBatchId(newBatch.id);
    } else {
      // Merge into target existing batch
      targetBatch = updatedBatches.find(b => b.id === importTargetBatchId) || null;
      if (!targetBatch) return;

      // Check if new columns need to be added
      const existingColMap = new Map<string, AssessmentColumn>();
      targetBatch.columns.forEach(c => existingColMap.set(c.subject.toLowerCase(), c));

      const newCols = [...targetBatch.columns];
      selectedSubjects.forEach(sub => {
        if (!existingColMap.has(sub.toLowerCase())) {
          const col: AssessmentColumn = {
            id: generateId('col'),
            subject: sub,
            coefficient: 1,
          };
          newCols.push(col);
          existingColMap.set(sub.toLowerCase(), col);
        }
      });

      const updatedScores = { ...(targetBatch.scores || {}) };
      excelImportData.results.forEach(res => {
        if (res.matched && res.studentId) {
          if (!updatedScores[res.studentId]) {
            updatedScores[res.studentId] = {};
          }
          selectedSubjects.forEach(sub => {
            const col = existingColMap.get(sub.toLowerCase());
            if (col) {
              const sc = res.scores[sub];
              if (sc !== undefined) {
                updatedScores[res.studentId][col.id] = sc;
              }
            }
          });
        }
      });

      targetBatch.columns = newCols;
      targetBatch.scores = updatedScores;
    }

    saveAssessments(updatedBatches);
    onUpdateAssessments(updatedBatches);
    setIsImportModalOpen(false);
    setExcelImportData(null);
    onShowToast(`Đã nhập dữ liệu ${selectedSubjects.length} môn điểm từ Excel thành công!`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Điểm kiểm tra nhiều môn
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý các đợt khảo sát, thi học kỳ (Toán, Văn, Anh...) và đồng bộ sổ liên lạc
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* + TẠO ĐỢT KIỂM TRA (Requirement 13 & 14) */}
          <button
            type="button"
            id="btn-create-assessment-batch"
            onClick={handleOpenNewBatch}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ TẠO ĐỢT KIỂM TRA</span>
          </button>

          {/* ✨ AI QUÉT THÔNG MINH (Requirement: Dùng AI quét để khớp và hiển thị cột điểm) */}
          <label
            id="btn-ai-scan-grades-label"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer ring-1 ring-violet-400/30"
            title="Sử dụng Gemini AI quét tự động tìm cột điểm, môn học và khớp học sinh chính xác"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAIScanning ? 'AI đang quét file...' : '✨ AI QUÉT BẢNG ĐIỂM'}</span>
            <input
              type="file"
              id="file-input-grades-ai"
              accept=".xlsx, .xls, .csv"
              onChange={handleAIGradesFileChange}
              disabled={isAIScanning || isParsing}
              className="hidden"
            />
          </label>

          {/* 📎 GỬI FILE EXCEL THƯỜNG */}
          <label
            id="btn-import-grades-label"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            title="Đọc bảng điểm theo chuẩn bảng tính thông thường"
          >
            <Upload className="w-4 h-4" />
            <span>{isParsing ? 'Đang đọc...' : 'Gửi file Excel'}</span>
            <input
              type="file"
              id="file-input-grades-excel"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelGradesFileChange}
              disabled={isParsing || isAIScanning}
              className="hidden"
            />
          </label>

          {/* Tải mẫu Excel */}
          <button
            type="button"
            id="btn-download-grades-template"
            onClick={() => downloadGradesTemplate(students)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Tải file Excel mẫu bảng điểm nhiều môn"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Tải mẫu</span>
          </button>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div 
          id="assessments-empty-state"
          className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-2xl mx-auto my-8 shadow-xs"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Chưa có đợt kiểm tra nào</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Một đợt kiểm tra (ví dụ: Khảo sát đầu năm, Giữa kỳ 1) có thể chứa nhiều môn học cùng lúc như Toán, Ngữ văn, Tiếng Anh...
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="btn-empty-create-batch"
              onClick={handleOpenNewBatch}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ TẠO ĐỢT KIỂM TRA MỚI</span>
            </button>
            <label
              id="btn-empty-import-grades"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>📎 GỬI FILE EXCEL ĐIỂM</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelGradesFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Batches Selector Pills */}
          <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {assessments.map(b => (
                <button
                  key={b.id}
                  id={`btn-select-batch-${b.id}`}
                  onClick={() => setSelectedBatchId(b.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    activeBatch?.id === b.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                    activeBatch?.id === b.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {b.columns.length} môn
                  </span>
                </button>
              ))}
            </div>

            {activeBatch && (
              <button
                id="btn-delete-active-batch"
                onClick={() => setBatchToDelete(activeBatch)}
                className="text-xs text-rose-600 hover:text-rose-800 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 ml-4"
                title="Xóa đợt kiểm tra này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa đợt</span>
              </button>
            )}
          </div>

          {/* Active Batch Scores Table */}
          {activeBatch && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Batch Meta Bar */}
              <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{activeBatch.name}</h2>
                    <span className="text-xs text-slate-500">• Ngày: {activeBatch.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {activeBatch.columns.map(c => (
                      <span key={c.id} className="text-[11px] font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {c.subject}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Save Table Button */}
                <div>
                  <button
                    type="button"
                    id="btn-save-score-table"
                    onClick={handleSaveScoreTable}
                    disabled={!hasScoreChanges}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      hasScoreChanges
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>LƯU ĐIỂM {hasScoreChanges ? '(CÓ THAY ĐỔI)' : ''}</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">STT</th>
                      <th className="px-4 py-3 min-w-44">Họ và tên</th>
                      {activeBatch.columns.map(col => (
                        <th key={col.id} className="px-3 py-3 text-center min-w-24">
                          {col.subject}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center w-24">ĐTB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={activeBatch.columns.length + 3} className="text-center py-8 text-slate-400">
                          Chưa có học sinh trong lớp. Hãy thêm học sinh tại tab "Học sinh".
                        </td>
                      </tr>
                    ) : (
                      students.map((student, idx) => {
                        const studentScoreRecord = editingScores[student.id] || {};

                        // Calculate average for student
                        let sum = 0;
                        let validCount = 0;
                        activeBatch.columns.forEach(c => {
                          const sc = studentScoreRecord[c.id];
                          if (sc !== null && sc !== undefined) {
                            sum += sc;
                            validCount++;
                          }
                        });
                        const avg = validCount > 0 ? (sum / validCount).toFixed(1) : '—';

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-2.5 text-center text-slate-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                              {student.fullName}
                            </td>
                            {activeBatch.columns.map(col => {
                              const scoreVal = studentScoreRecord[col.id];
                              const displayVal = scoreVal !== null && scoreVal !== undefined ? scoreVal : '';

                              return (
                                <td key={col.id} className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    id={`input-grade-${student.id}-${col.id}`}
                                    value={displayVal}
                                    onChange={(e) => handleScoreCellChange(student.id, col.id, e.target.value)}
                                    placeholder="—"
                                    className="w-16 px-2 py-1 text-center font-bold text-slate-800 text-xs rounded border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                  />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5 text-center font-extrabold text-indigo-600">
                              {avg}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE MULTI-SUBJECT ASSESSMENT BATCH (Requirement 14) */}
      <Modal
        id="modal-new-assessment-batch"
        isOpen={isNewBatchModalOpen}
        onClose={() => setIsNewBatchModalOpen(false)}
        title="Tạo đợt kiểm tra mới (Nhiều môn)"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveNewBatch} className="space-y-4">
          {/* Tên đợt kiểm tra */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên đợt kiểm tra <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-batch-name"
              required
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder="Ví dụ: Khảo sát đầu năm, Giữa học kỳ 1, Kiểm tra tháng 9..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Ngày kiểm tra */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ngày kiểm tra
            </label>
            <input
              type="date"
              id="input-batch-date"
              value={newBatchDate}
              onChange={(e) => setNewBatchDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Danh sách các môn kiểm tra trong đợt này (Requirement 14) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Các môn kiểm tra trong đợt này
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Một đợt kiểm tra chứa nhiều môn học. Bạn có thể thêm hoặc bớt môn học tùy ý.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {newBatchSubjects.map(sub => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold"
                >
                  <span>{sub}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubjectTag(sub)}
                    className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Thêm môn học tùy chỉnh */}
            <div className="flex gap-2">
              <input
                type="text"
                id="input-custom-subject"
                value={customSubjectInput}
                onChange={(e) => setCustomSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubjectTag();
                  }
                }}
                placeholder="Nhập tên môn khác (ví dụ: Tin học, Lịch sử...)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                id="btn-add-subject-tag"
                onClick={handleAddSubjectTag}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                + Thêm môn
              </button>
            </div>
          </div>

          {/* Buttons: LƯU, HỦY */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-new-batch"
              onClick={() => setIsNewBatchModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
            >
              HỦY
            </button>
            <button
              type="submit"
              id="btn-save-new-batch"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              TẠO ĐỢT KIỂM TRA
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PREVIEW EXCEL GRADE IMPORT (Requirement 15) */}
      {isImportModalOpen && excelImportData && (
        <Modal
          id="modal-preview-excel-grades"
          isOpen={true}
          onClose={() => setIsImportModalOpen(false)}
          title="Xem trước kết quả đối chiếu & nhận diện điểm"
          maxWidthClass="max-w-4xl"
        >
          <div className="space-y-4">
            {/* Header info & AI badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {excelImportData.source === 'ai' ? 'Đã quét bằng Google Gemini AI' : 'Quét tự động thông minh'}
                </span>
                <span className="text-xs text-indigo-900 font-medium">
                  Khớp <strong>{excelImportData.results.filter(r => r.matched).length} / {students.length}</strong> học sinh trong lớp
                </span>
              </div>

              {currentGradesFile && (
                <button
                  type="button"
                  id="btn-modal-rescan-ai"
                  onClick={handleReScanWithAI}
                  disabled={isAIScanning}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAIScanning ? 'animate-spin' : ''}`} />
                  <span>{isAIScanning ? 'AI đang quét lại...' : '✨ Quét lại bằng Gemini AI'}</span>
                </button>
              )}
            </div>

            {/* Target Batch Selector */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Chọn đợt kiểm tra để lưu điểm:
                </label>
                <select
                  id="select-import-target-batch"
                  value={importTargetBatchId}
                  onChange={(e) => setImportTargetBatchId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="create_new">+ Tạo thành đợt kiểm tra mới từ file này</option>
                  {assessments.map(b => (
                    <option key={b.id} value={b.id}>
                      Ghép vào: {b.name} ({b.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllSubjects(true)}
                  className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Chọn tất cả môn
                </button>
              </div>
            </div>

            {/* Column selection chips (Requirement: Hiển thị các cột có điểm trong file) */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Các cột điểm nhận diện được trong file (Bấm để bật/tắt cột cần lưu):
              </label>
              <div className="flex flex-wrap gap-2">
                {excelImportData.subjects.map(sub => {
                  const isSelected = selectedSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleToggleSubject(sub)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-200" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warning if unmatched names */}
            {excelImportData.unmatchedNames.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                <strong>Lưu ý:</strong> Có {excelImportData.unmatchedNames.length} học sinh trong file không khớp với danh sách lớp ({excelImportData.unmatchedNames.slice(0, 4).join(', ')}...).
              </div>
            )}

            {/* Table Preview */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center">STT</th>
                    <th className="px-3 py-2">Họ và tên</th>
                    <th className="px-3 py-2 text-center">Đối chiếu</th>
                    {selectedSubjects.map(s => (
                      <th key={s} className="px-3 py-2 text-center bg-indigo-50/50 text-indigo-950 font-bold">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {excelImportData.results.map((res, idx) => (
                    <tr key={idx} className={res.matched ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                      <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{res.studentName}</td>
                      <td className="px-3 py-2 text-center">
                        {res.matched ? (
                          <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">Khớp</span>
                        ) : (
                          <span className="text-rose-700 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded">Không khớp</span>
                        )}
                      </td>
                      {selectedSubjects.map(sub => {
                        const sc = res.scores[sub];
                        return (
                          <td key={sub} className="px-3 py-2 text-center font-semibold text-slate-700">
                            {sc !== null && sc !== undefined ? sc : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                id="btn-cancel-import-grades"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                id="btn-confirm-import-grades"
                onClick={handleConfirmImportGrades}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                XÁC NHẬN LƯU {selectedSubjects.length} MÔN ĐIỂM
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CONFIRM DELETE BATCH */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa đợt kiểm tra?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc muốn xóa đợt kiểm tra <strong>{batchToDelete.name}</strong> cùng toàn bộ điểm số liên quan?
            </p>
            <div className="flex justify-end gap-3">
              <button
                id="btn-cancel-delete-batch"
                onClick={() => setBatchToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
              >
                HỦY
              </button>
              <button
                id="btn-confirm-delete-batch"
                onClick={handleConfirmDeleteBatch}
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
