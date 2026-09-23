"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, LogIn, UserPlus, Zap, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/";
    });
  }, []);

  const handleAuth = async (isLogin: boolean) => {
    if (!email || !password) {
      setMessage({ type: "error", text: "Пожалуйста, введите Email и пароль." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: "success", text: "Регистрация успешна! Проверьте email либо сразу войдите." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Ошибка авторизации" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-card2)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '14px 16px 14px 44px',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    transition: 'border-color 200ms, box-shadow 200ms',
  } as React.CSSProperties;

  return (
    <div
      className="flex items-center justify-center min-h-[calc(100vh-6rem)] px-4 animate-in slide-in-from-bottom-4 duration-500 relative"
    >
      {/* Page-level ambient glows */}
      <div
        className="fixed top-0 left-1/4 w-96 h-96 pointer-events-none -z-0"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 65%)' }}
      />
      <div
        className="fixed bottom-0 right-1/4 w-80 h-80 pointer-events-none -z-0"
        style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 65%)' }}
      />

      <div className="w-full max-w-md relative z-10">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                boxShadow: '0 8px 32px rgba(124,58,237,0.5)',
              }}
            >
              <Zap size={28} color="white" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-black gradient-text mb-1">Qabilet</h1>
          <p className="text-[var(--text-muted)] text-sm">Платформа доступности</p>
        </div>

        {/* Card */}
        <div
          className="relative overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.08)',
            padding: '36px',
          }}
        >
          {/* Top highlight line */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent)' }}
          />

          {/* Corner glows */}
          <div
            className="absolute top-0 right-0 w-40 h-40 -mr-16 -mt-16 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-32 h-32 -ml-12 -mb-12 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.1) 0%, transparent 70%)' }}
          />

          <div className="relative z-10">
            {/* Tab switcher */}
            <div
              className="flex p-1 mb-8"
              style={{
                background: 'var(--bg-card2)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
              }}
            >
              {[
                { label: 'Войти', value: false, icon: LogIn },
                { label: 'Регистрация', value: true, icon: UserPlus },
              ].map(({ label, value, icon: Icon }) => (
                <button
                  key={String(value)}
                  onClick={() => { setIsRegister(value); setMessage(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={isRegister === value ? {
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                    color: 'white',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                  } : {
                    color: 'var(--text-muted)',
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Message */}
            {message && (
              <div
                className="mb-5 p-4 rounded-xl text-sm font-medium"
                style={message.type === 'error' ? {
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'rgb(252,165,165)',
                } : {
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  color: '#34D399',
                }}
              >
                {message.text}
              </div>
            )}

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 ml-1">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="ваш@email.com"
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(124,58,237,0.5)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border-color)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 ml-1">
                  Пароль
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth(!isRegister)}
                    style={inputStyle}
                    placeholder="••••••••"
                    onFocus={e => {
                      (e.target as HTMLElement).style.borderColor = 'rgba(124,58,237,0.5)';
                      (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border-color)';
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={() => handleAuth(!isRegister)}
              disabled={loading}
              className="btn-primary w-full mt-7 py-4 text-base justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 animate-spin inline-block"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  Загрузка...
                </span>
              ) : isRegister ? (
                <><UserPlus size={18} /> Зарегистрироваться</>
              ) : (
                <><LogIn size={18} /> Войти в систему</>
              )}
            </button>

            {/* Footer note */}
            <div className="flex items-center justify-center gap-2 mt-5">
              <ShieldCheck size={13} className="text-[var(--text-muted)]" />
              <p className="text-center text-xs text-[var(--text-muted)]">
                Данные защищены шифрованием
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
