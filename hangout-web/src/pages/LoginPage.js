import React, { useState } from "react";
import { loginApi } from "../api/auth";
import { saveToken, saveUser } from "../utils/storage";

export default function LoginPage({ onLogin, onGoRegister }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

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

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="juan@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((err) => ({ ...err, email: "" })); }}
                className={errors.email ? "input-error" : email ? "input-success" : ""}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((err) => ({ ...err, password: "" })); }}
                className={errors.password ? "input-error" : password ? "input-success" : ""}
              />
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