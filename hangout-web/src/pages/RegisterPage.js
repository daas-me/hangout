import React, { useState, useRef } from "react";
import { registerApi } from "../api/auth";
import "../styles/global.css";
import "../styles/auth.css";

const today = new Date();

// Min birthdate: must be at least 13 years old
const minBirth  = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
const minISO    = minBirth.toISOString().split("T")[0];

// Max birthdate: reasonable oldest age (120 years)
const maxBirth  = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
const maxISO    = maxBirth.toISOString().split("T")[0];

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
  const [showReqs, setShowReqs] = useState(false);
  const datePickerRef = useRef(null);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((err) => ({ ...err, [k]: "" }));
  };

  // Masked MM/DD/YYYY input handler
  function handleBirthdateInput(e) {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5);
    v = v.slice(0, 10);

    // Block future dates as user types
    if (v.length === 10) {
      const iso  = toISO(v);
      const date = iso ? new Date(iso) : null;
      if (date && date > today) return; // silently block future dates
    }

    setForm((f) => ({ ...f, birthdate: v }));
    setErrors((err) => ({ ...err, birthdate: "" }));
  }

  // Sync from native date picker to masked input
  function handleNativePicker(e) {
    const iso = e.target.value; // YYYY-MM-DD
    if (!iso) return;
    const [yyyy, mm, dd] = iso.split("-");
    const masked = `${mm}/${dd}/${yyyy}`;
    setForm((f) => ({ ...f, birthdate: masked }));
    setErrors((err) => ({ ...err, birthdate: "" }));
  }

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

  // Derive ISO value from masked input for the hidden native picker
  const birthdateISO = toISO(form.birthdate) ?? "";
  const birthdateValid = form.birthdate.length === 10 && !!toISO(form.birthdate);

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

            {/* Birthdate — typeable masked input + calendar icon opens picker via showPicker() */}
            <div className="field">
              <label>Birthdate</label>
              <div style={{ position: "relative" }}>
                {/* Typeable text input */}
                <input
                  type="text"
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  value={form.birthdate}
                  onChange={handleBirthdateInput}
                  className={errors.birthdate ? "input-error" : birthdateValid ? "input-success" : ""}
                  style={{ paddingRight: 44 }}
                />
                {/* Calendar icon — clicking opens the hidden picker programmatically */}
                <button
                  type="button"
                  onClick={() => datePickerRef.current?.showPicker()}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", padding: 4, cursor: "pointer",
                    display: "flex", alignItems: "center", color: "#8882aa",
                    borderRadius: 6, transition: "color 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a855f7"}
                  onMouseLeave={e => e.currentTarget.style.color = "#8882aa"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                </button>
                {/* Hidden date picker — opened only via ref.showPicker(), never visible */}
                <input
                  ref={datePickerRef}
                  type="date"
                  min={maxISO}
                  max={minISO}
                  value={birthdateISO}
                  onChange={handleNativePicker}
                  style={{
                    position: "absolute", opacity: 0,
                    width: 0, height: 0, pointerEvents: "none"
                  }}
                  tabIndex={-1}
                />
              </div>
              {errors.birthdate
                ? <span className="field-error">{errors.birthdate}</span>
                : <span style={{ fontSize: "0.78rem", color: "#8882aa", marginTop: 4 }}>
                    Must be at least 13 years old
                  </span>
              }
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password" placeholder="••••••••"
                autoComplete="new-password"
                value={form.password} onChange={set("password")}
                onFocus={() => setShowReqs(true)}
                className={errors.password ? "input-error" : form.password && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password) ? "input-success" : ""}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
              <PasswordStrengthBar password={form.password} />
              {(showReqs || form.password) && <PasswordRequirements password={form.password} />}
            </div>

            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password" placeholder="••••••••"
                autoComplete="new-password"
                value={form.confirmPassword} onChange={set("confirmPassword")}
                className={errors.confirmPassword ? "input-error" : form.confirmPassword && form.confirmPassword === form.password ? "input-success" : ""}
              />
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