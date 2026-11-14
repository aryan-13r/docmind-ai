import React, { useRef, useState, useEffect } from "react";
import { Upload, Trash2, Settings } from "lucide-react";
import type { Chat } from "../types/chat";
import AccountSection from "./AccountSection";
import { ArrowLeft } from "lucide-react";
import GeneralSection from "./GeneralSection";
import NotificationSection from "./NotificationSection";
import AppearanceSection from "./AppearanceSection";
import { getToken } from "../auth/authStore";
import { API_BASE_URL } from "../config/api";

interface SidebarProps {
  chats: Chat[];
  onSelect: (chat: Chat) => void;
  onUploadPDF: (file: File) => void;
  onDeleteChat: (chatId: string | number) => void;

  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setDocumentId: React.Dispatch<React.SetStateAction<string>>;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | number | null>>;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  onSelect,
  onUploadPDF,
  onDeleteChat,
  theme,
  setTheme,
  setChats,
  setDocumentId,
  setFileName,
  setActiveChatId
}) => {

  const fileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [activeSetting, setActiveSetting] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isListClosing, setIsListClosing] = useState(false);
  const [closingSection, setClosingSection] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [ghostChats, setGhostChats] = useState<any[]>([]);
  const [stack, setStack] = useState<string[]>([]);


  /* ================= CLICK OUTSIDE SETTINGS ================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        handleCloseSettings();
      }
    };

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, [showSettings]);


  /* ================= CHATS ================= */

  const allChats = chats;

  useEffect(() => {
  if (chats.length > 0) {
    setGhostChats([]);
  }
}, [chats]);

  const handleCloseSettings = () => {
  setIsClosing(true);
  setIsListClosing(true);

  setTimeout(() => {
    setShowSettings(false);
    setIsClosing(false);
    setIsListClosing(false);
    setActiveSetting(null);
    
    setStack([]);
  }, 250);
};


  return (
    <div className="sidebar glow">

      {/* Upload */}
      <button
        className="sidebar-button"
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={16} />
        Upload PDF
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) {
    // 🔥 ghost item add
            const tempId = "ghost-" + Date.now();

            setGhostChats(prev => [
              {
                id: tempId,
                title: file.name || "Uploading...",
                isGhost: true
              },
              ...prev
            ]);

    // original logic (touch nahi kiya)
            onUploadPDF(file);
          }

          e.target.value = "";
        }}
      />

      {/* History */}
      <div className="sidebar-section">
        <h4>History</h4>

        {allChats.length === 0 && ghostChats.length === 0 && (
          <div className="empty-history">No chats yet</div>
        )}

        {[...ghostChats, ...allChats].map(chat => (
          <div
            key={chat.id}
            className={`chat-item 
                  ${chat.isGhost ? "ghost-item" : ""}
                  ${selectedChatId === chat.id ? "active" : ""}
                  ${deletingId === chat.id ? "deleting" : ""}
                  ${
                    !chat.isGhost &&
                    chats[chats.length - 1]?.id === chat.id
                      ? "chat-enter"
                      : ""
                  }
                `}
            onClick={() => {
              setActiveChatId(chat.id);
              onSelect(chat);
            }}
          >

            <span className="chat-title">
              {chat.title}
            </span>

            {!chat.isGhost && (
              <button
                className="chat-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(chat.id);

                  setTimeout(() => {
                    onDeleteChat(chat.id);

                    if (selectedChatId === chat.id) {
                        setSelectedChatId(null);
                      }

                    setDeletingId(null);
                  }, 250);
                }}
              >
                <Trash2 size={14} />
              </button>
)}

          </div>
        ))}

      </div>


      {/* Settings Button */}
      <div className="sidebar-footer">

        <button
          className="sidebar-button-sidebar-settings"
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(prev => !prev);
          }}
        >

          <Settings size={16} />
          Settings
        </button>

      </div>


      {/* Settings Panel */}
      {showSettings && (

        <div
          ref={settingsRef}
          className={`sidebar-settings-panel ${
            isClosing ? "closing-zoom" : "opening-zoom"
          }`}
          onClick={(e) => e.stopPropagation()}
        >


          <div
  className="sidebar-settings-header"
  onClick={(e) => e.stopPropagation()}
>

  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

  {activeSetting && (
    <button
      onClick={(e) => {
        e.stopPropagation();

        setClosingSection(activeSetting);

        setTimeout(() => {
          setStack(prev => prev.slice(0, -1));
          setActiveSetting(null);
          setClosingSection(null);
          
        }, 200);
      }}
      style={{
        background: "none",
        border: "none",
        color: "#aaa",
        cursor: "pointer",
        fontSize: "14px"
      }}
    >
      <ArrowLeft size={16} />
    </button>
  )}

  <span>
    {activeSetting
      ? activeSetting.charAt(0).toUpperCase() + activeSetting.slice(1)
      : "Settings"}
  </span>

</div>

  <button onClick={handleCloseSettings}>
    ✕
  </button>

</div>


{stack.length === 0 && (
  <ul
    className={`sidebar-settings-list ${
      isListClosing ? "list-closing" : "list-opening"
    }`}
        style={{
          position: "relative",
          zIndex: 2
        }}
  >

  <li
  onClick={(e) => {
    e.stopPropagation();

    if (activeSetting === "general") {
      setClosingSection("general");

      setTimeout(() => {
        setActiveSetting(null);
        setClosingSection(null);
        
      }, 200);
    } else if (activeSetting) {
      // 🔥 SWITCH FIX (IMPORTANT)
      setClosingSection(activeSetting);

      setTimeout(() => {
        setStack(prev => [...prev, "general"]);
        setActiveSetting("general");
        setClosingSection(null);
      }, 200);

    } else {
      
      setStack(prev => [...prev, "general"]);
      setActiveSetting("general");
    }
  }}
>
  General
</li>


<li
  onClick={(e) => {
    e.stopPropagation();

    if (activeSetting === "notifications") {
      setClosingSection("notifications");

      setTimeout(() => {
        setActiveSetting(null);
        setClosingSection(null);
       
      }, 200);
    } else if (activeSetting) {
      setClosingSection(activeSetting);

      setTimeout(() => {
        setStack(prev => [...prev, "notifications"]);
        setActiveSetting("notifications");
        setClosingSection(null);
      }, 200);

    } else {
     
      setStack(prev => [...prev, "notifications"]);
      setActiveSetting("notifications");
    }
  }}
>
  Notifications
</li>


<li
  onClick={(e) => {
    e.stopPropagation();

    if (activeSetting === "appearance") {
      setClosingSection("appearance");

      setTimeout(() => {
        setActiveSetting(null);
        setClosingSection(null);
        
      }, 200);
    } else if (activeSetting) {
      setClosingSection(activeSetting);

      setTimeout(() => {
        setStack(prev => [...prev, "appearance"]);
        setActiveSetting("appearance");
        setClosingSection(null);
      }, 200);

    } else {
      
      setStack(prev => [...prev, "appearance"]);
      setActiveSetting("appearance");
    }
  }}
>
  Appearance
</li>


<li
  onClick={(e) => {
    e.stopPropagation();

    if (activeSetting === "account") {
      setClosingSection("account");

      setTimeout(() => {
        setActiveSetting(null);
        setClosingSection(null);
       
      }, 200);
    } else if (activeSetting) {
      setClosingSection(activeSetting);

      setTimeout(() => {
        setStack(prev => [...prev, "account"]);
        setActiveSetting("account");
        setClosingSection(null);
      }, 200);

    } else {
     
      setStack(prev => [...prev, "account"]);
      setActiveSetting("account");
    }
  }}
>
  Account
</li>

</ul>
)}


          <div style={{
            position: "relative",
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            minHeight: activeSetting ? "150px" : "auto"
          }}>

            {(activeSetting === "general" || closingSection === "general") && (
              <div
                key="general"
                className={closingSection === "general" ? "section-closing" : "section-opening"}
                style={{
                  position: "relative",
                  width: "100%",
                  zIndex: 1
                }}
              >
                <GeneralSection
                    onClearChats={() => {
                      setChats([]);
                    }}
                    onClearAll={async () => {

                      try {
                        await fetch(`${API_BASE_URL}/delete-all-chats`, {
                          method: "DELETE",
                          headers: {
                          Authorization: `Bearer ${getToken()}`
                          }
                        });
                      } catch (err) {
                        console.error("Failed to clear backend chats", err);
                      }

                      setChats([]);
                      setActiveChatId(null);
                      setDocumentId("");
                      setFileName("");

                      localStorage.removeItem("active_chat_id");
                      localStorage.removeItem("active_document_id");
                    }}
                  />
              </div>
            )}

            {(activeSetting === "notifications" || closingSection === "notifications") && (
              <div
                key="notifications"
                className={closingSection === "notifications" ? "section-closing" : "section-opening"}
                style={{
                  position: "relative",
                  width: "100%",
                  zIndex: 1
                }}
              >
                <NotificationSection />
              </div>
            )}

            {(activeSetting === "appearance" || closingSection === "appearance") && (
              <div
                key="appearance"
                className={closingSection === "appearance" ? "section-closing" : "section-opening"}
                style={{
                  position: "relative",
                  width: "100%",
                  zIndex: 1
                }}
              >
                <AppearanceSection theme={theme} setTheme={setTheme} />
              </div>
            )}

            {(activeSetting === "account" || closingSection === "account") && (
              <div
                key="account"
                className={closingSection === "account" ? "section-closing" : "section-opening"}
                style={{
                  position: "relative",
                  width: "100%",
                  zIndex: 1
                }}
              >

                <div className="account-section-fix">
                    <AccountSection />
                </div>
              </div>
            )}

          </div>

        </div>

      )}

    </div>
  );
};

export default Sidebar;
