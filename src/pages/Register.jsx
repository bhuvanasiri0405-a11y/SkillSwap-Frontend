import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    try {
      const res = await api.post("/auth/register", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      const errors = data?.errors && typeof data.errors === "object"
        ? data.errors
        : {};
      const message = typeof data === "string"
        ? data
        : data?.message || data?.detail;

      setFieldErrors(errors);
      setError(
        message ||
          (Object.keys(errors).length
            ? "Please correct the highlighted fields."
            : "Registration failed. Try again.")
      );
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Add your skills and start swapping in a minute."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      {error && <div className="alert alert-error" id="registration-error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? (fieldErrors.name === error ? "registration-error" : "name-error") : undefined} />
          {fieldErrors.name && fieldErrors.name !== error && <p className="field-error" id="name-error">{fieldErrors.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? (fieldErrors.email === error ? "registration-error" : "email-error") : undefined} />
          {fieldErrors.email && fieldErrors.email !== error && <p className="field-error" id="email-error">{fieldErrors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? (fieldErrors.password === error ? "registration-error" : "password-error") : undefined} />
          {fieldErrors.password && fieldErrors.password !== error && <p className="field-error" id="password-error">{fieldErrors.password}</p>}
        </div>
        <button className="btn btn-block btn-lg" type="submit">Create account</button>
      </form>
    </AuthLayout>
  );
}

export default Register;
