import React, { useState } from "react";
import "../styles/login.css";
import { saveToken } from "../auth/authStore";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function Signup() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fadeOut, setFadeOut] = useState(false);

  const handleGoogleLogin = () => {
    setFadeOut(true);

    setTimeout(() => {
      window.location.href = `${API_BASE_URL}/auth/google`;
    }, 400);
  };

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
    setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      setPasswordError("Minimum 8 characters required");
    } else if (!/[A-Z]/.test(value)) {
      setPasswordError("At least one uppercase letter");
    } else if (!/[a-z]/.test(value)) {
      setPasswordError("At least one lowercase letter");
    } else if (!/[0-9]/.test(value)) {
      setPasswordError("At least one number");
    } else if (!/[!@#$%^&*]/.test(value)) {
      setPasswordError("At least one special character");
    } else {
      setPasswordError("");
    }
      };

  const handleSignup = async () => {

    if (emailError || passwordError) {
      if (emailError || passwordError) return;
      return;
    }

    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {

      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        saveToken(data.access_token);

        setFadeOut(true);

        setTimeout(() => {
          window.location.href = "/";
        }, 400);
      } else {
        alert(data.detail);
      }

    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup failed");
    }

  };

  return (
    <div className={`login-container ${fadeOut ? "fade-out" : ""}`}>

      <div className="login-wrapper"> {/* 🔥 FIX */}

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

          <h2 className="login-title">Create Account</h2>

          <button
            onClick={handleGoogleLogin}
            className="google-login-btn"
          >
             Sign up with Google
          </button>

          <div className="divider">OR</div>

          <div className="form">

            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validateEmail(e.target.value);
              }}
            />

            {emailError && <span className="error-text">{emailError}</span>}

            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
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

            {passwordError && <span className="error-text">{passwordError}</span>}

            <div className="input-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <span
                className="toggle-eye"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </span>
          </div>

            <button
              type="button"
              onClick={handleSignup}
              className="email-login-btn"
            >
              Create Account
            </button>

          </div>

          <p className="switch-auth">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>
              Sign in
            </span>
          </p>

        </div>

      </div>

    </div>
  );
}