import React from "react";

interface Props {
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}

const AppearanceSection: React.FC<Props> = ({ theme, setTheme }) => {

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="settings-inner">

      <div className="setting-row">
        <span>Dark Mode</span>

        <div
          className={`theme-switch ${theme === "dark" ? "active" : ""}`}
          onClick={toggleTheme}
        >
          <div className="switch-thumb" />
        </div>

      </div>

    </div>
  );
};

export default AppearanceSection;