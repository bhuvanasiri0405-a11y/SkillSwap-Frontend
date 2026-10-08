import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/register", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === "string" ? data : "Registration failed. Try again.");
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Add your skills and start swapping in a minute."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn btn-block btn-lg" type="submit">Create account</button>
      </form>
    </AuthLayout>
  );
}

export default Register;