"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, LogIn, UserPlus, ShieldCheck, Loader2, Mic, HandMetal, Video, BrainCircuit } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Alert } from "@/components/ui/feedback";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";
import { useLanguage } from "@/components/LanguageProvider";

/** Turns Supabase auth errors into messages a user can act on. */
function describeAuthError(err: { code?: string; message?: string; status?: number }): string {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Email ещё не подтверждён. Откройте письмо от Supabase и перейдите по ссылке, затем войдите.";
  }
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Неверный email или пароль.";
  }
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered")) {
    return "Этот email уже зарегистрирован. Войдите или используйте другой адрес.";
  }
  if (code === "weak_password" || msg.includes("password should be")) {
    return "Пароль слишком простой. Используйте не меньше 6 символов.";
  }
  if (code === "over_email_send_rate_limit" || msg.includes("rate limit")) {
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  }
  if (code === "email_address_invalid" || msg.includes("invalid format") || msg.includes("is invalid")) {
    return "Проверьте адрес email.";
  }
  if (err?.status === 0 || msg.includes("failed to fetch")) {
    return "Нет связи с сервером авторизации. Проверьте интернет и настройки Supabase.";
  }
  return err?.message || "Ошибка авторизации";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) window.location.href = "/";
      })
      // A broken stored session must not block the login form.
      .catch(() => {});
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // Confirmation links return to the site the user registered on
          // (localhost or the deployed domain) instead of the dashboard default.
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          // Email confirmation is off in Supabase: the user is signed in already.
          window.location.href = "/";
          return;
        }
        if (data.user && data.user.identities?.length === 0) {
          // Supabase hides whether an email exists; an empty identities list
          // means this address is already registered.
          setMessage({ type: "error", text: "Этот email уже зарегистрирован. Войдите или используйте другой адрес." });
          return;
        }
        setIsRegister(false);
        setMessage({
          type: "success",
          text: "Аккаунт создан. Мы отправили письмо на " + email + ". Перейдите по ссылке из письма, затем войдите.",
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: describeAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const { t } = useLanguage();

  const highlights = [
    { icon: Mic, title: t('nav_voice'), desc: t('voice_subtitle') },
    { icon: HandMetal, title: t('home_signs_title'), desc: t('signs_subtitle') },
    { icon: Video, title: t('home_call_title'), desc: t('call_subtitle') },
    { icon: BrainCircuit, title: t('home_ai_title'), desc: t('home_features_sub') },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      {/* Form column */}
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <Wordmark />

        <div className="flex flex-1 items-center py-12">
          <FadeIn className="mx-auto w-full max-w-[380px] space-y-7">
            <div className="space-y-2">
              <h1 className="text-display text-fg">{isRegister ? 'Регистрация' : 'Войти'}</h1>
              <p className="text-[0.9375rem] text-fg-muted">Платформа доступности</p>
            </div>

            <Segmented<"login" | "register">
              id="auth-mode"
              ariaLabel="Режим входа"
              fullWidth
              value={isRegister ? "register" : "login"}
              items={[
                { value: "login", label: 'Войти', icon: <LogIn />, onSelect: () => { setIsRegister(false); setMessage(null); } },
                { value: "register", label: 'Регистрация', icon: <UserPlus />, onSelect: () => { setIsRegister(true); setMessage(null); } },
              ]}
            />

            {message && (
              <Alert tone={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>
            )}

            <div className="space-y-4">
              <Field label="Email" htmlFor="auth-email">
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ваш@email.com"
                  leadingIcon={<Mail />}
                />
              </Field>
              <Field label="Пароль" htmlFor="auth-password">
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth(!isRegister)}
                  placeholder="••••••••"
                  leadingIcon={<Lock />}
                />
              </Field>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => handleAuth(!isRegister)}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Загрузка...
                </>
              ) : isRegister ? (
                <><UserPlus size={16} /> Зарегистрироваться</>
              ) : (
                <><LogIn size={16} /> Войти в систему</>
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
              <ShieldCheck size={13} aria-hidden />
              Данные защищены шифрованием
            </p>
          </FadeIn>
        </div>
      </div>

      {/* Product panel */}
      <aside className="hidden border-l border-border bg-subtle lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-16">
        <Stagger className="max-w-sm space-y-8" delay={0.15} stagger={0.05}>
          <StaggerItem className="space-y-3">
            <p className="text-eyebrow">Qabilet</p>
            <p className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-fg">
              {t('home_hero_title')} {t('home_hero_title2')}
            </p>
          </StaggerItem>
          <div className="space-y-5">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted shadow-xs">
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{title}</span>
                  <span className="block text-[0.8125rem] leading-relaxed text-fg-muted">{desc}</span>
                </span>
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      </aside>
    </div>
  );
}
