import React, { useState } from "react";
import { registerApi } from "../api/auth";

export default function RegisterPage({ onGoLogin }) {
  const [form, setForm]       = useState({ firstname: "", lastname: "", email: "", password: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await registerApi(form.firstname, form.lastname, form.email, form.password);
      setSuccess("Account created! You can now sign in.");
      setTimeout(() => onGoLogin(), 1500);
    } catch (err) {
      setError(err.message);
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

          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field">
                <label>First Name</label>
                <input type="text" placeholder="Juan" value={form.firstname} onChange={set("firstname")} required />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input type="text" placeholder="Dela Cruz" value={form.lastname} onChange={set("lastname")} required />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="juan@example.com" value={form.email} onChange={set("email")} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required />
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