import React, { useState } from "react";
import { loginApi } from "../api/auth";
import { saveToken, saveUser } from "../utils/storage";
import "../styles/global.css";
import "../styles/auth.css";

export default function LoginPage({ onLogin, onGoRegister }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }

    setLoading(true);
    try {
      const data = await loginApi(email, password);
      saveToken(data.token);
      saveUser({ email: data.email, firstname: data.firstname });

      // Ask the browser to save / update the credentials for this site
      if (window.PasswordCredential) {
        try {
          const cred = new window.PasswordCredential({ id: email, password });
          await navigator.credentials.store(cred);
        } catch (_) {
          // Non-fatal — browser may silently decline
        }
      }

      onLogin({ email: data.email, firstname: data.firstname });
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      {/* Left panel */}
      <div className="auth-panel">
        <div className="auth-panel-orb" />
        <div className="auth-panel-content">
          <div className="auth-panel-logo">HangOut</div>
          <div className="auth-panel-tagline">
            Discover and host local events. Connect with your community, one hangout at a time.
          </div>
          <div className="auth-panel-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-side">
        <div className="auth-form-box">
          <div className="auth-tabs">
            <button className="auth-tab active">Sign In</button>
            <button className="auth-tab" onClick={onGoRegister}>Register</button>
          </div>

          <div className="form-title">Welcome back</div>
          <div className="form-subtitle">Sign in to your HangOut account</div>

          {errors.general && <div className="alert alert-error">{errors.general}</div>}

          <form onSubmit={handleSubmit} noValidate autoComplete="on">
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="juan@example.com"
                value={email}
                autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setErrors(err => ({ ...err, email: "" })); }}
                className={errors.email ? "input-error" : email ? "input-success" : ""}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => { setPassword(e.target.value); setErrors(err => ({ ...err, password: "" })); }}
                  className={errors.password ? "input-error" : password ? "input-success" : ""}
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: showPass ? "#a855f7" : "#8882aa", display: "flex", alignItems: "center",
                    borderRadius: 6, transition: "color 0.15s" }}>
                  {showPass
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}