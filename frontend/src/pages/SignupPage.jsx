import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { TOKEN_KEY } from "../lib/constants";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.remove("dashboard-page", "light-mode");
    document.body.dataset.theme = "dark";
  }, []);

  async function signup(userName, userEmail, userPassword) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName, email: userEmail, password: userPassword })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Registration failed.");
    }

    return payload;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await signup(name.trim(), email.trim(), password);
      localStorage.setItem(TOKEN_KEY, result.token);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Create your PRIME Finance account and start tracking every rupee with style."
      footer={
        <>
          <p id="auth-message" className="message">
            {message}
          </p>
          <p className="switch-link">
            Already have an account? <Link to="/login">Go to login</Link>
          </p>
        </>
      }
    >
      <form id="signup-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
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
            placeholder="At least 8 characters"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit">
          Sign Up
        </button>
      </form>
    </AuthLayout>
  );
}
