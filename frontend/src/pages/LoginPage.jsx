import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { TOKEN_KEY } from "../lib/constants";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.remove("dashboard-page", "light-mode");
    document.body.dataset.theme = "dark";
  }, []);

  async function login(userEmail, userPassword) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: userPassword })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Login failed.");
    }

    return payload;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await login(email.trim(), password);
      localStorage.setItem(TOKEN_KEY, result.token);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your savings journey, goals, and daily money flow."
      footer={
        <>
          <p id="auth-message" className="message">
            {message}
          </p>
          <p className="switch-link">
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </>
      }
    >
      <form id="login-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Your password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit">
          Login
        </button>
      </form>
    </AuthLayout>
  );
}
