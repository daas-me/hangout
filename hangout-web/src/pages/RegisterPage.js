import React, { useState } from "react";
import { registerApi } from "../api/auth";
import "../styles/global.css";
import "../styles/auth.css";

const today = new Date().toISOString().split("T")[0];

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
        {strength === "weak" && "Weak password"}
        {strength === "medium" && "Medium password"}
        {strength === "strong" && "Strong password ✓"}
      </span>
    </div>
  );
}

export default function RegisterPage({ onGoLogin }) {
  const [form, setForm] = useState({
    firstname: "", lastname: "", email: "",
    password: "", confirmPassword: "", birthdate: ""
  });
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReqs, setShowReqs] = useState(false);

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

    if (!form.birthdate) {
      e.birthdate = "Birthdate is required";
    } else if (form.birthdate > today) {
      e.birthdate = "Birthdate cannot be in the future";
    } else {
      const birth = new Date(form.birthdate);
      const now   = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      if (age < 13) e.birthdate = "You must be at least 13 years old to register";
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
      await registerApi({
        firstname: form.firstname,
        lastname:  form.lastname,
        email:     form.email,
        password:  form.password,
        birthdate: form.birthdate,
      });
      setSuccess("Account created! Redirecting to sign in...");
      setTimeout(() => onGoLogin(), 1500);
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

            <div className="field">
              <label>Birthdate</label>
              <input
                type="date" value={form.birthdate}
                onChange={set("birthdate")} max={today}
                className={errors.birthdate ? "input-error" : form.birthdate ? "input-success" : ""}
              />
              {errors.birthdate && <span className="field-error">{errors.birthdate}</span>}
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password" placeholder="••••••••"
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