import React, { useState, useEffect } from 'react';
import { 
  loadClassInfo, 
  loadStudents, 
  loadAttendance, 
  loadAssessments, 
  loadDiscipline, 
  loadViolationTemplates,
  getStudentByToken 
} from './storage';
import { ClassInfo, Student, AttendanceSession, AssessmentBatch, DisciplineRecord, ViolationTemplate, ViewType } from './types';
import { Header } from './components/Header';
import { Toast, ToastMessage } from './components/Toast';
import { OverviewView } from './components/OverviewView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { AssessmentsView } from './components/AssessmentsView';
import { DisciplineView } from './components/DisciplineView';
import { ParentPortalTeacherView } from './components/ParentPortalTeacherView';
import { ParentPortalStudentView } from './components/ParentPortalStudentView';
import { SettingsView } from './components/SettingsView';
import { ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import { subscribeToFirebase } from './services/firebase';

export function App() {
  // Check URL query parameters for parent portal link (?portal=parent&token=xyz)
  const [parentToken, setParentToken] = useState<string | null>(null);
  const [isParentPortalMode, setIsParentPortalMode] = useState<boolean>(false);

  // Application Data States
  const [classInfo, setClassInfo] = useState<ClassInfo>(loadClassInfo);
  const [students, setStudents] = useState<Student[]>(loadStudents);
  const [attendance, setAttendance] = useState<AttendanceSession[]>(loadAttendance);
  const [assessments, setAssessments] = useState<AssessmentBatch[]>(loadAssessments);
  const [discipline, setDiscipline] = useState<DisciplineRecord[]>(loadDiscipline);
  const [templates, setTemplates] = useState<ViolationTemplate[]>(loadViolationTemplates);

  // Active View State
  const [currentView, setCurrentView] = useState<ViewType>('overview');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const reloadAllFromStorage = () => {
    setClassInfo(loadClassInfo());
    setStudents(loadStudents());
    setAttendance(loadAttendance());
    setAssessments(loadAssessments());
    setDiscipline(loadDiscipline());
    setTemplates(loadViolationTemplates());
  };

  // Inspect URL parameters on mount and hash changes
  useEffect(() => {
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const token = params.get('token');

      if (portal === 'parent' && token) {
        setParentToken(token);
        setIsParentPortalMode(true);
      } else {
        setParentToken(null);
        setIsParentPortalMode(false);
      }
    };

    checkUrl();
    window.addEventListener('popstate', checkUrl);

    // Optional realtime updates from Firebase if configured
    const unsubscribeFb = subscribeToFirebase((remoteData) => {
      if (remoteData) {
        if (remoteData.classInfo) setClassInfo(remoteData.classInfo);
        if (remoteData.students) setStudents(remoteData.students);
        if (remoteData.attendance) setAttendance(remoteData.attendance);
        if (remoteData.assessments) setAssessments(remoteData.assessments);
        if (remoteData.discipline) setDiscipline(remoteData.discipline);
        if (remoteData.templates) setTemplates(remoteData.templates);
      }
    });

    return () => {
      window.removeEventListener('popstate', checkUrl);
      if (unsubscribeFb) unsubscribeFb();
    };
  }, []);

  // PARENT PORTAL STANDALONE MODE (Requirement 16, 19, 21)
  if (isParentPortalMode) {
    const student = parentToken ? getStudentByToken(parentToken) : null;

    if (!student) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-slate-200 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Link không hợp lệ</h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Mã bảo mật không tồn tại hoặc đã bị thu hồi bởi Giáo viên chủ nhiệm. Vui lòng liên hệ với GVCN để nhận link mới nhất.
            </p>
            <button
              type="button"
              id="btn-return-home"
              onClick={() => {
                window.history.pushState({}, '', window.location.pathname);
                setIsParentPortalMode(false);
                setParentToken(null);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về trang chủ ứng dụng</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <ParentPortalStudentView
        student={student}
        classInfo={classInfo}
        attendance={attendance}
        assessments={assessments}
        discipline={discipline}
        isStandalone={true}
        onBackToTeacher={() => {
          window.history.pushState({}, '', window.location.pathname);
          setIsParentPortalMode(false);
          setParentToken(null);
        }}
      />
    );
  }

  // TEACHER PORTAL MODE
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Header Navigation */}
      <Header
        classInfo={classInfo}
        currentView={currentView}
        currentTab={currentView}
        onNavigate={setCurrentView}
        onTabChange={setCurrentView}
        studentsCount={students.length}
      />

      {/* Main App Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'overview' && (
          <OverviewView
            classInfo={classInfo}
            students={students}
            attendance={attendance}
            assessments={assessments}
            discipline={discipline}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'students' && (
          <StudentsView
            students={students}
            onUpdateStudents={setStudents}
            onShowToast={showToast}
          />
        )}

        {currentView === 'attendance' && (
          <AttendanceView
            students={students}
            attendance={attendance}
            onUpdateAttendance={setAttendance}
            onShowToast={showToast}
          />
        )}

        {currentView === 'assessments' && (
          <AssessmentsView
            students={students}
            assessments={assessments}
            onUpdateAssessments={setAssessments}
            onShowToast={showToast}
          />
        )}

        {currentView === 'discipline' && (
          <DisciplineView
            students={students}
            discipline={discipline}
            templates={templates}
            onUpdateDiscipline={setDiscipline}
            onUpdateTemplates={setTemplates}
            onShowToast={showToast}
          />
        )}

        {currentView === 'parent-portal' && (
          <ParentPortalTeacherView
            students={students}
            classInfo={classInfo}
            attendance={attendance}
            assessments={assessments}
            discipline={discipline}
            onUpdateStudents={setStudents}
            onUpdateClassInfo={setClassInfo}
            onShowToast={showToast}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            classInfo={classInfo}
            onUpdateClassInfo={setClassInfo}
            students={students}
            attendance={attendance}
            assessments={assessments}
            discipline={discipline}
            templates={templates}
            onReloadAllData={reloadAllFromStorage}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Toast Notification Stack */}
      <Toast toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}

export default App;
