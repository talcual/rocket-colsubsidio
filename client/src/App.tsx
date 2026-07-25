import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import SessionsPage from './pages/SessionsPage';
import CountPage from './pages/CountPage';
import AuditPage from './pages/AuditPage';
import type { Employee, CountSession } from './types';

type AppView = 'login' | 'sessions' | 'count' | 'audit';

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeSession, setActiveSession] = useState<CountSession | null>(null);

  const handleLogin = (emp: Employee) => {
    setEmployee(emp);
    setView('sessions');
  };

  const handleStartSession = (session: CountSession) => {
    setActiveSession(session);
    setView('count');
  };

  const handleResumeSession = (session: CountSession) => {
    setActiveSession(session);
    setView('count');
  };

  const handleSessionClose = () => {
    setActiveSession(null);
    setView('sessions');
  };

  if (view === 'login' || !employee) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (view === 'audit') {
    return <AuditPage onBack={() => setView('sessions')} />;
  }

  if (view === 'count' && activeSession) {
    return (
      <CountPage
        employee={employee}
        session={activeSession}
        onSessionClose={handleSessionClose}
      />
    );
  }

  return (
    <SessionsPage
      employee={employee}
      onStartNewSession={handleStartSession}
      onResumeSession={handleResumeSession}
      onViewAudit={() => setView('audit')}
    />
  );
}
