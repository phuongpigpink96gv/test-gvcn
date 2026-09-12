import React, { useState } from 'react';
import { 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  ShieldAlert, 
  BookOpen, 
  Settings, 
  LayoutDashboard,
  Menu,
  X,
  School,
  Sparkles
} from 'lucide-react';
import { ClassInfo, TabType } from '../types';

interface HeaderProps {
  currentTab?: TabType;
  currentView?: TabType;
  onTabChange?: (tab: TabType) => void;
  onNavigate?: (tab: TabType) => void;
  classInfo: ClassInfo;
  studentsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentView,
  onTabChange,
  onNavigate,
  classInfo,
  studentsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTab: TabType = currentView || currentTab || 'overview';

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'students', label: 'Học sinh', icon: <Users className="w-4 h-4" /> },
    { id: 'attendance', label: 'Điểm danh', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'assessments', label: 'Điểm kiểm tra', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'discipline', label: 'Vi phạm & Thi đua', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'parent-portal', label: 'Sổ liên lạc PH', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'settings', label: 'Cài đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSelectTab = (tab: TabType) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (onTabChange) {
      onTabChange(tab);
    }
    setMobileMenuOpen(false);
  };

  const hasConfig = Boolean(classInfo.className || classInfo.schoolName || classInfo.homeroomTeacher);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Class Meta */}
          <div className="flex items-center gap-3">
            <div 
              id="header-logo"
              onClick={() => handleSelectTab('overview')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-sm font-bold text-lg">
                360
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">GVCN 360</span>
                  <span className="text-[10px] uppercase font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200/60">
                    MINI
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">
                  Sổ tay Giáo viên Chủ nhiệm
                </p>
              </div>
            </div>

            {/* Class Info Pill */}
            <div className="hidden md:flex items-center pl-4 border-l border-slate-200">
              {hasConfig ? (
                <div 
                  id="header-class-info-badge"
                  onClick={() => handleSelectTab('settings')}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                  title="Nhấn để sửa thông tin lớp"
                >
                  <School className="w-4 h-4 text-indigo-600" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">
                      {classInfo.className ? `Lớp ${classInfo.className}` : 'Chưa đặt tên lớp'}
                    </span>
                    {classInfo.schoolName && (
                      <span className="text-slate-500 ml-1.5">• {classInfo.schoolName}</span>
                    )}
                    {classInfo.homeroomTeacher && (
                      <span className="text-slate-500 ml-1.5 hidden lg:inline">• GVCN: {classInfo.homeroomTeacher}</span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  id="btn-header-setup-class"
                  onClick={() => handleSelectTab('settings')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Chưa cấu hình lớp • Cài đặt ngay</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Counter (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="px-3 py-1 bg-slate-100 rounded-full">
              Sĩ số: <strong className="text-slate-900 font-bold ml-1">{studentsCount}</strong> học sinh
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:block bg-slate-50/70 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-1.5 overflow-x-auto scrollbar-none" aria-label="Tabs">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {/* Mobile Class Info */}
          <div className="py-2 px-3 mb-2 bg-slate-50 rounded-lg text-xs border border-slate-200">
            <div className="font-bold text-slate-800">
              {classInfo.className ? `Lớp ${classInfo.className}` : 'Chưa đặt tên lớp'}
            </div>
            {classInfo.schoolName && <div className="text-slate-500">{classInfo.schoolName}</div>}
            {classInfo.homeroomTeacher && <div className="text-slate-500">GVCN: {classInfo.homeroomTeacher}</div>}
            <div className="text-slate-600 mt-1">Sĩ số: <strong>{studentsCount}</strong> học sinh</div>
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-mobile-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

