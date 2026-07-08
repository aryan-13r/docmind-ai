import React, { useState, useEffect } from "react";

const NotificationSection = () => {

  const [sound, setSound] = useState(() => {
    return localStorage.getItem("notif_sound") !== "false";
  });

  const [desktop, setDesktop] = useState(() => {
    return localStorage.getItem("notif_desktop") === "true";
  });

  /* SAVE */
  useEffect(() => {
    localStorage.setItem("notif_sound", String(sound));
  }, [sound]);

  useEffect(() => {
    localStorage.setItem("notif_desktop", String(desktop));
  }, [desktop]);

  /* DESKTOP PERMISSION */
  const handleDesktopToggle = async () => {
    if (!desktop) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    setDesktop(prev => !prev);
  };

  return (
    <div className="settings-inner">

      {/* SOUND */}
      <div className="setting-row">
        <span>Sound Effects</span>

        <div
          className={`theme-switch ${sound ? "active" : ""}`}
          onClick={() => setSound(prev => !prev)}
        >
          <div className="switch-thumb" />
        </div>
      </div>

      {/* DESKTOP */}
      <div className="setting-row">
        <span>Desktop Notifications</span>

        <div
          className={`theme-switch ${desktop ? "active" : ""}`}
          onClick={handleDesktopToggle}
        >
          <div className="switch-thumb" />
        </div>
      </div>

      {/* NOTE */}
      <div className="setting-note">
        Enable notifications to get alerts for responses and uploads.
      </div>

    </div>
  );
};

export default NotificationSection;