import React, { useState } from "react";
import { registerApi } from "../api/auth";
import "../styles/global.css";
import DatePicker from "./DatePicker";
import "../styles/auth.css";

const today = new Date();



function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[a-z]/.test(password))         score++;
  if (/\d/.test(password))            score++;
  if (/[^A-Za-z\d]/.test(password))  score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

function PasswordRequirements({ password }) {
  const reqs = [
    { label: "At least 8 characters",       met: password.length >= 8 },
    { label: "One uppercase letter (A-Z)",   met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)",   met: /[a-z]/.test(password) },
    { label: "One number (0-9)",             met: /\d/.test(password) },
    { label: "One special character",        met: /[^A-Za-z\d]/.test(password) },
  ];
  return (
    <div className="password-reqs">
      {reqs.map((r) => (
        <div key={r.label} className={`req-item ${r.met ? "met" : ""}`}>
          {r.label}
        </div>
      ))}
    </div>
  );
}

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  return (
    <div className="password-strength">
      <div className="strength-bars">
        <div className={`strength-bar ${strength === "weak" || strength === "medium" || strength === "strong" ? strength : ""}`} />
        <div className={`strength-bar ${strength === "medium" || strength === "strong" ? strength : ""}`} />
        <div className={`strength-bar ${strength === "strong" ? strength : ""}`} />
      </div>
      <span className={`strength-label ${strength}`}>
        {strength === "weak"   && "Weak password"}
        {strength === "medium" && "Medium password"}
        {strength === "strong" && "Strong password ✓"}
      </span>
    </div>
  );
}

// Convert MM/DD/YYYY → YYYY-MM-DD for API / comparisons
function toISO(mmddyyyy) {
  if (!mmddyyyy || mmddyyyy.length < 10) return null;
  const [mm, dd, yyyy] = mmddyyyy.split("/");
  if (!mm || !dd || !yyyy || yyyy.length < 4) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export default function RegisterPage({ onGoLogin }) {
  const [form, setForm] = useState({
    firstname: "", lastname: "", email: "",
    password: "", confirmPassword: "", birthdate: ""
  });
  const [errors,   setErrors]   = useState({});
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showReqs,     setShowReqs]     = useState(false);
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((err) => ({ ...err, [k]: "" }));
  };

  function validate() {
    const e = {};
    if (!form.firstname.trim()) e.firstname = "First name is required";
    if (!form.lastname.trim())  e.lastname  = "Last name is required";

    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email address";

    if (!form.birthdate || form.birthdate.length < 10) {
      e.birthdate = "Birthdate is required (MM/DD/YYYY)";
    } else {
      const iso  = toISO(form.birthdate);
      const birth = iso ? new Date(iso) : null;
      if (!birth || isNaN(birth)) {
        e.birthdate = "Enter a valid date (MM/DD/YYYY)";
      } else if (birth > today) {
        e.birthdate = "Birthdate cannot be in the future";
      } else {
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        if (age < 13) e.birthdate = "You must be at least 13 years old to register";
      }
    }

    if (!form.password) {
      e.password = "Password is required";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password)) {
      e.password = "Password does not meet the requirements below";
    }

    if (!form.confirmPassword) {
      e.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }

    setLoading(true);
    try {
      const iso = toISO(form.birthdate);
      await registerApi({
        firstname: form.firstname,
        lastname:  form.lastname,
        email:     form.email,
        password:  form.password,
        birthdate: iso,
      });
      setSuccess("Account created! Redirecting to sign in...");
      setTimeout(() => onGoLogin(), 1500);
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  }

  const birthdateValid = form.birthdate.length === 10 && /^\d{2}\/\d{2}\/\d{4}$/.test(form.birthdate);

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
            <button className="auth-tab" onClick={onGoLogin}>Sign In</button>
            <button className="auth-tab active">Register</button>
          </div>

          <div className="form-title">Create account</div>
          <div className="form-subtitle">Join the HangOut community today</div>

          {errors.general && <div className="alert alert-error">{errors.general}</div>}
          {success        && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="field">
                <label>First Name</label>
                <input
                  type="text" placeholder="Juan"
                  value={form.firstname} onChange={set("firstname")}
                  className={errors.firstname ? "input-error" : form.firstname ? "input-success" : ""}
                />
                {errors.firstname && <span className="field-error">{errors.firstname}</span>}
              </div>
              <div className="field">
                <label>Last Name</label>
                <input
                  type="text" placeholder="Dela Cruz"
                  value={form.lastname} onChange={set("lastname")}
                  className={errors.lastname ? "input-error" : form.lastname ? "input-success" : ""}
                />
                {errors.lastname && <span className="field-error">{errors.lastname}</span>}
              </div>
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email" placeholder="juan@example.com"
                value={form.email} onChange={set("email")}
                className={errors.email ? "input-error" : form.email ? "input-success" : ""}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Birthdate — custom picker, max = 13 years ago */}
            <div className="field">
              <label>Birthdate</label>
              <DatePicker
                value={form.birthdate}
                onChange={v => { setForm(f => ({ ...f, birthdate: v })); setErrors(e => ({ ...e, birthdate: "" })); }}
                max={new Date()}
                error={!!errors.birthdate}
                success={!errors.birthdate && birthdateValid}
                inputBackground="#1a1a2e"
              />
              {errors.birthdate
                ? <span className="field-error">{errors.birthdate}</span>
                : <span style={{ fontSize: "0.78rem", color: "#8882aa", marginTop: 4 }}>
                    Must be at least 13 years old
                  </span>
              }
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} placeholder="••••••••"
                  autoComplete="new-password"
                  value={form.password} onChange={set("password")}
                  onFocus={() => setShowReqs(true)}
                  className={errors.password ? "input-error" : form.password && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password) ? "input-success" : ""}
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
              <PasswordStrengthBar password={form.password} />
              {(showReqs || form.password) && <PasswordRequirements password={form.password} />}
            </div>

            <div className="field">
              <label>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"} placeholder="••••••••"
                  autoComplete="new-password"
                  value={form.confirmPassword} onChange={set("confirmPassword")}
                  className={errors.confirmPassword ? "input-error" : form.confirmPassword && form.confirmPassword === form.password ? "input-success" : ""}
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: showConfirm ? "#a855f7" : "#8882aa", display: "flex", alignItems: "center",
                    borderRadius: 6, transition: "color 0.15s" }}>
                  {showConfirm
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}