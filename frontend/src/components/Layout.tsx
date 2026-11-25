
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';

export default function Layout({
  children,
  mainClassName
}: {
  children: React.ReactNode;
  mainClassName?: string;
}) {
  const location = useLocation();
  const path = location.pathname;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  return (
    <div className="font-body-md text-body-md overflow-x-hidden flex h-screen bg-background text-on-background selection:bg-secondary-container selection:text-on-surface">

      {/* Mobile Top Navigation */}
      <header className="md:hidden w-full border-b-4 border-primary bg-surface flex justify-between items-center px-container-margin py-base max-w-full fixed top-0 z-[60]">
        <div className="font-headline-md text-headline-md font-bold tracking-tighter text-primary">
          Smart Health Assistant
        </div>

        <div className="flex gap-4 text-primary">
          <ThemeToggle />

          <button
            onClick={() => setShowEmergency(true)}
            aria-label="Emergency protocols"
            className="material-symbols-outlined hover:bg-secondary-container transition-colors duration-100 p-2 brutalist-border"
          >
            emergency
          </button>

          <span className="material-symbols-outlined p-2 brutalist-border">
            account_circle
          </span>

          <button
            aria-label="Toggle Navigation Menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="material-symbols-outlined hover:bg-secondary-container transition-colors duration-100 p-2 brutalist-border cursor-pointer"
          >
            {isMobileMenuOpen ? 'close' : 'menu'}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-primary/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col bg-surface fixed left-0 top-0 h-full w-64 border-r-4 border-primary p-base z-50 justify-between overflow-y-auto`}>

        <div>
          <div className="mb-8 p-4 flex justify-between items-start">
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary mb-2">
                Smart Health Assistant
              </h1>

              <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary-container inline-block border-2 border-primary" />
                Clinical AI Active
              </div>
            </div>

            <ThemeToggle />
          </div>

          <ul className="flex flex-col gap-4 font-label-caps text-label-caps uppercase">

            {/* Dashboard */}
            <li>
              <Link
                onClick={() => setIsMobileMenuOpen(false)}
                to="/dashboard"
                className={`flex items-center gap-3 p-3 block transition-all duration-75 ${
                  path === '/dashboard'
                    ? 'bg-secondary-container text-on-secondary-container border-4 border-primary translate-x-[-6px] translate-y-[-6px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:translate-x-[0px] dark:translate-y-[0px] dark:shadow-none'
                    : 'text-primary border-2 border-transparent hover:bg-secondary-container brutalist-border'
                }`}
              >
                <span className="material-symbols-outlined">dashboard</span>
                Dashboard
              </Link>
            </li>

            {/* Medical Records */}
            <li>
              <Link
                onClick={() => setIsMobileMenuOpen(false)}
                to="/reports"
                className={`flex items-center gap-3 p-3 block transition-all duration-75 ${
                  path === '/reports'
                    ? 'bg-secondary-container text-on-secondary-container border-4 border-primary translate-x-[-6px] translate-y-[-6px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:translate-x-[0px] dark:translate-y-[0px] dark:shadow-none'
                    : 'text-primary border-2 border-transparent hover:bg-secondary-container brutalist-border'
                }`}
              >
                <span className="material-symbols-outlined">folder_shared</span>
                Medical Records
              </Link>
            </li>

            {/* Analytics */}
            <li>
              <Link
                onClick={() => setIsMobileMenuOpen(false)}
                to="/analytics"
                className={`flex items-center gap-3 p-3 block transition-all duration-75 ${
                  path === '/analytics'
                    ? 'bg-secondary-container text-on-secondary-container border-4 border-primary translate-x-[-6px] translate-y-[-6px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:translate-x-[0px] dark:translate-y-[0px] dark:shadow-none'
                    : 'text-primary border-2 border-transparent hover:bg-secondary-container brutalist-border'
                }`}
              >
                <span className="material-symbols-outlined">monitoring</span>
                Analytics
              </Link>
            </li>

            {/* AI Consult */}
            <li>
              <Link
                onClick={() => setIsMobileMenuOpen(false)}
                to="/ai-consult"
                className={`flex items-center gap-3 p-3 block transition-all duration-75 ${
                  path === '/ai-consult'
                    ? 'bg-secondary-container text-on-secondary-container border-4 border-primary translate-x-[-6px] translate-y-[-6px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:translate-x-[0px] dark:translate-y-[0px] dark:shadow-none'
                    : 'text-primary border-2 border-transparent hover:bg-secondary-container brutalist-border'
                }`}
              >
                <span className="material-symbols-outlined">smart_toy</span>
                AI Consult
              </Link>
            </li>

          </ul>
        </div>

        {/* Sidebar Bottom */}
        <div className="flex flex-col gap-4 mt-auto font-label-caps text-label-caps uppercase pt-8">

          <button
            onClick={() => setShowEmergency(true)}
            className="w-full bg-[#FF4D4D] text-white brutalist-border p-3 brutalist-shadow active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all font-bold"
          >
            EMERGENCY PROTOCOL
          </button>

          <ul className="flex flex-col gap-2">
            <li>
              <Link
                to="/auth"
                className="flex items-center gap-3 p-3 text-primary border-2 border-transparent hover:bg-secondary-container transition-all duration-75 block brutalist-border"
              >
                <span className="material-symbols-outlined">logout</span>
                Sign Out
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Emergency Guidance Popup */}
      {showEmergency && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowEmergency(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-title"
            className="bg-surface text-on-background border-4 border-primary brutalist-shadow w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2
                id="emergency-title"
                className="text-xl font-bold text-[#FF4D4D]"
              >
                EMERGENCY PROTOCOL
              </h2>

              <button
                onClick={() => setShowEmergency(false)}
                aria-label="Close emergency guidance"
                className="text-2xl font-bold px-3 border-2 border-primary"
              >
                ×
              </button>
            </div>

            <div className="bg-red-100 text-red-900 p-4 border-2 border-red-500 mb-5">
              <p className="font-bold text-lg">
                Emergency Helpline: 112
              </p>
              <p className="text-sm mt-1">
                Call India's emergency response number 112 for immediate assistance.
              </p>
              <a
                href="tel:112"
                className="inline-block mt-3 bg-red-700 text-white px-5 py-2 font-bold"
              >
                CALL 112
              </a>
            </div>

            <h3 className="font-bold mb-2">
              Seek immediate medical help if someone has:
            </h3>

            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Severe difficulty breathing</li>
              <li>Severe chest pain</li>
              <li>Unconsciousness or sudden confusion</li>
              <li>Signs of stroke, such as facial drooping or sudden weakness</li>
              <li>Severe bleeding</li>
              <li>A severe allergic reaction with breathing difficulty or swelling</li>
              <li>A seizure lasting more than 5 minutes</li>
            </ul>

            <h3 className="font-bold mt-5 mb-2">
              What should you do?
            </h3>

            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Call 112 immediately if the situation is life-threatening.</li>
              <li>Follow instructions from emergency responders.</li>
              <li>Do not delay medical care to use this application.</li>
              <li>Do not give an unconscious person food or water.</li>
            </ul>

            <p className="text-xs mt-5 border-t-2 border-primary pt-3">
              Important: Smart Health Assistant is not an emergency medical service.
              This guidance does not replace professional medical care.
            </p>

            <button
              onClick={() => setShowEmergency(false)}
              className="w-full mt-5 bg-primary text-white p-3 font-bold brutalist-border"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={
          mainClassName ||
          "flex-1 w-full md:ml-64 mt-20 md:mt-0 p-container-margin md:p-12 overflow-y-auto"
        }
      >
        {children}
      </main>

      {/* Mobile Footer */}
      <footer className="md:hidden w-full border-t-4 border-primary bg-primary text-white font-data-mono text-data-mono py-container-margin px-container-margin flex flex-col items-center gap-gutter text-center mt-auto">
        <div className="font-headline-lg-mobile text-headline-lg-mobile">
          Smart Health Assistant
        </div>
        <p className="text-xs">
          © 2026 SMART HEALTH ASSISTANT. ALL RIGHTS RESERVED.
        </p>
      </footer>

    </div>
  );
}
