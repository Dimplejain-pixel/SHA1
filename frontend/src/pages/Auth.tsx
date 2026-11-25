
import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';

const API_URL = 'http://127.0.0.1:8000/api/v1/auth';

export default function Auth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let response: Response;

      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Login failed. Check your credentials.');
        }

        if (!data.access_token) {
          throw new Error('Login succeeded but no access token was returned.');
        }

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('token_type', data.token_type || 'bearer');

        navigate('/dashboard');
      } else {
        response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email,
            full_name: fullName,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === 'string'
              ? data.detail
              : 'Registration failed. Please check your details.'
          );
        }

        setSuccess('Account created successfully! Please log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Cannot connect to the backend. Check that FastAPI is running.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background h-screen flex font-body-md selection:bg-secondary-container selection:text-on-surface">
      <div className="hidden md:flex w-24 lg:w-32 bg-primary text-white border-r-border-width border-primary flex-col justify-between items-center py-container-margin relative z-10 shrink-0">
        <div className="font-headline-md text-headline-md font-bold tracking-tighter">SHA</div>
        <div className="font-headline-xl text-headline-xl vertical-text tracking-widest uppercase">
          SMART HEALTH ASSISTANT
        </div>
        <span className="material-symbols-outlined text-4xl">medical_services</span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-container-margin lg:p-12 relative overflow-hidden bg-surface-container-lowest">
        <div className="absolute top-container-margin right-container-margin z-20">
          <ThemeToggle />
        </div>

        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="w-full max-w-md bg-surface-container-lowest border-border-width border-primary p-8 brutalist-shadow relative z-10">
          <div className="mb-gutter text-center md:text-left">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-2 uppercase border-b-border-width border-primary inline-block pb-2">
              {isLogin ? 'Authenticate' : 'Initialize'}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant font-bold">
              Smart Health Assistant v1.0 // HEALTH ASSISTANT ACTIVE
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 border-2 border-red-500 text-red-600 font-bold">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="mb-4 p-3 border-2 border-green-600 text-green-700 font-bold">
              {success}
            </div>
          )}

          <form className="space-y-gutter" onSubmit={handleSubmit}>
            {!isLogin && (
              <Input
                id="fullName"
                type="text"
                label="FULL NAME"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            <Input
              id="email"
              type="email"
              label="EMAIL IDENTIFIER"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="SECURITY KEY"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="font-data-mono text-data-mono font-bold underline decoration-2 hover:bg-secondary-container px-1 transition-colors bg-transparent border-none cursor-pointer"
              >
                {isLogin ? 'Create Account' : 'Authenticate Instead'}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 font-headline-md text-headline-md py-4 uppercase flex items-center justify-center gap-3"
            >
              <span>
                {loading
                  ? 'Please wait...'
                  : isLogin
                    ? 'Authenticate'
                    : 'Register'}
              </span>
              <span className="material-symbols-outlined">
                {isLogin ? 'login' : 'person_add'}
              </span>
            </Button>
          </form>

          <div className="my-gutter border-t-border-width border-primary relative flex justify-center">
            <span className="bg-primary text-white px-4 absolute -top-3 font-label-caps text-label-caps">
              SMART HEALTH ASSISTANT
            </span>
          </div>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Your health information should remain private. Use test data for this prototype.
          </p>
        </div>
      </main>
    </div>
  );
}
