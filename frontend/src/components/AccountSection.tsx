import React, { useState, useEffect } from "react";
import { getToken, removeToken } from "../auth/authStore";

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

const AccountSection: React.FC = () => {

  const [profile, setProfile] = useState<UserProfile | null>(null);

  /* ================= LOAD PROFILE ================= */

  useEffect(() => {

    const token = getToken();

    if (!token) return;

    fetch("http://localhost:8000/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => {
      removeToken();
      window.location.href = "/login";
    });

  }, []);

  /* ================= LOGOUT ================= */

  const handleLogout = () => {

    localStorage.clear();
    removeToken();

    window.location.href = "/login";

  };

  /* ================= UI ================= */

 if (!profile) {
  return (
    <div className="account-loading">
      Loading...
    </div>
  );
}
 const cleanName = profile.name;

  return (

    <div className="account-section">

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>

        <img
          src={profile.picture}
          alt="avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-avatar.png";
          }}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%"
          }}
        />

        <div>
          <div>👤 {cleanName}</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            📧 {profile.email}
          </div>
        </div>

      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleLogout}
          className="account-button logout"
        >
          Logout
        </button>
      </div>

    </div>

  );

};

export default AccountSection;