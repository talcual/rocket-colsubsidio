import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import SessionsPage from './pages/SessionsPage';
import CountPage from './pages/CountPage';
import BackofficePage from './pages/BackofficePage';
import ModeSelectorPage from './pages/ModeSelectorPage';
import type { Employee, CountSession } from './types';

type AppEnvironment = 'selector' | 'external' | 'backoffice';
type ExternalView = 'login' | 'sessions' | 'count';

export default function App() {
  const [environment, setEnvironment] = useState<AppEnvironment>('selector');
  const [externalView, setExternalView] = useState<ExternalView>('login');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeSession, setActiveSession] = useState<CountSession | null>(null);

  const handleLogin = (emp: Employee) => {
    setEmployee(emp);
    setExternalView('sessions');
  };

  const handleStartSession = (session: CountSession) => {
    setActiveSession(session);
    setExternalView('count');
  };

  const handleResumeSession = (session: CountSession) => {
    setActiveSession(session);
    setExternalView('count');
  };

  const handleSessionClose = () => {
    setActiveSession(null);
    setExternalView('sessions');
  };

  const resetExternalFlow = () => {
    setEmployee(null);
    setActiveSession(null);
    setExternalView('login');
  };

  if (environment === 'selector') {
    return (
      <ModeSelectorPage
        onSelectBackoffice={() => setEnvironment('backoffice')}
        onSelectExternal={() => {
          resetExternalFlow();
          setEnvironment('external');
        }}
      />
    );
  }

  if (environment === 'backoffice') {
    return <BackofficePage onBack={() => setEnvironment('selector')} />;
  }

  if (externalView === 'login' || !employee) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (externalView === 'count' && activeSession) {
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
      onExit={() => setEnvironment('selector')}
    />
  );
}
