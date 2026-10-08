import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === "string" ? data : "Login failed. Check your email and password.");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue swapping skills."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn btn-block btn-lg" type="submit">Log in</button>
      </form>
    </AuthLayout>
  );
}

export default Login;