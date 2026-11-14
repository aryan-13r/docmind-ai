import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, saveToken } from "../auth/authStore";
import "../styles/login.css";
import { API_BASE_URL } from "../config/api";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = getToken();
    if (existingToken) {
      setFadeOut(true);

      setTimeout(() => {
      navigate("/");
    }, 400);
      return;
    }

    

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      console.log("🔑 OAuth token received:", token);

      saveToken(token);
      window.dispatchEvent(new Event("storage")); //

      window.history.replaceState({}, document.title, "/");
      
      setFadeOut(true);
      setTimeout(() => navigate("/"), 400);
    }
  }, [navigate]);

  const handleGoogleLogin = () => {
    setFadeOut(true);

    setTimeout(() => {
      window.location.href = `${API_BASE_URL}/auth/google`;
    }, 400); // thoda smooth delay
  };

  const handleLogin = async () => {
    if (loading) return; // prevent multiple clicks

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      console.log("STATUS:", res.status);
      console.log("DATA:", data);

      if (res.ok) {
        setError("");

        saveToken(data.access_token);
        window.dispatchEvent(new Event("storage")); // 🔥 ADD THIS
        

        setFadeOut(true);
        setTimeout(() => navigate("/"), 400);

      } else {
        if (data?.detail?.includes("Google")) {
          setError("This account uses Google. Click below to continue.");
        } else {
          setError(data?.detail || "Login failed");
        }
      }

    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-container ${fadeOut ? "fade-out" : ""}`}>

      <div className="login-wrapper">

        {/* LEFT SIDE */}
        <div className="login-left">
          <div className="left-content">
          <h1 className="login-heading">Welcome to DocMind</h1>

          <p className="login-subtext">
            AI That Reads Between The Lines
          </p>
          </div>
        </div>
        {/* RIGHT SIDE */}
        <div className="login-right">

          <h2 className="login-title">DocMind</h2>

          <button
            onClick={handleGoogleLogin}
            className="google-login-btn"
          >
             Sign in with Google
          </button>

          <div className="divider">OR</div>

          <div className="form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoFocus
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />

          <div className="input-group">

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
            />

            <span
  className="toggle-eye"
  onClick={() => setShowPassword(!showPassword)}
>
  {showPassword ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0112 19C5 19 1 12 1 12a21.8 21.8 0 015.06-6.94"></path>
      <path d="M9.9 4.24A10.94 10.94 0 0112 5c7 0 11 7 11 7a21.8 21.8 0 01-2.16 3.19"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  )}
</span>

          </div>
          {error && <p className="error-text">{error}</p>}

            <button
              type="button"
              onClick={handleLogin}
              className="email-login-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>

          <p className="switch-auth">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
            >
              Sign up
            </span>
          </p>

        </div>

      </div>

    </div>
  );
};

export default Login;