import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/layout.css";
import RAGPanel from "./components/RAGPanel";
import PodcastPanel from "./components/PodcastPanel";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Signup from "./pages/signup";

import type { Chat, Message } from "./types/chat";
import { getToken } from "./auth/authStore";

function Dashboard() {

const [theme, setTheme] = useState<"dark" | "light">(() => {
  return (localStorage.getItem("theme") as "dark" | "light") || "light";
});


  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const [fadeIn, setFadeIn] = useState(false);
    useEffect(() => {
      setTimeout(() => setFadeIn(true), 50);
    }, []);
  
    useEffect(() => {

    const token = getToken();

    if (token) {

      const savedDoc = localStorage.getItem("active_document_id");

      if (savedDoc && savedDoc.startsWith("guest_")) {

        console.log("🔁 Clearing guest document after login");

        setChats([]);
        setActiveChatId(null);
        setDocumentId("");
        setFileName("");

        localStorage.removeItem("active_chat_id");
        localStorage.removeItem("active_document_id");

      }

    }

  }, []);

    useEffect(() => {
    setTimeout(() => {
      setInitialLoading(false);
    }, 600);
  }, []);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | number | null>(null);
  const [documentId, setDocumentId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const activeChat = chats.find(chat => chat.id === activeChatId) || null;

  const [uploading, setUploading] = useState(false);
 

  /* ================= LOAD HISTORY ================= */

  const loadHistory = async () => {

  try {

    const token = getToken();
    if (!token) return;

    const res = await fetch("http://localhost:8000/history", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    const formatted: Chat[] = data.map((item: any) => {

      const msgs: Message[] = (item.messages || []).flatMap((m: any) => [
        {
          id: crypto.randomUUID(),
          role: "user",
          content: m.question
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: m.answer
        }
      ]);

      return {
        id: item.id,
        title: item.file_name || "Document Chat",
        documentId: item.document_id || "",
        messages: msgs
      };

    });

    setChats(formatted.reverse());

  } catch (err) {
    console.error("History load error:", err);
  }

};

useEffect(() => {
  const autoSave = localStorage.getItem("auto_save") !== "false";

  if (autoSave) {
    loadHistory();
  }
}, []);

  /* ================= CHAT SWITCH ================= */

useEffect(() => {

  // 🔥 CRITICAL FIX
  if (activeChatId === null) return;

  const chat = chats.find(c => c.id === activeChatId);

  if (chat) {

    setDocumentId(chat.documentId || "");
    setFileName(chat.title);

    localStorage.setItem("active_chat_id", String(chat.id));
    localStorage.setItem("active_document_id", chat.documentId || "");

  }

}, [activeChatId, chats]);

  /* ================= PDF UPLOAD ================= */

  const handleUploadPDF = async (file: File) => {

  if (!file || uploading) return;

  /* ⭐ show filename instantly */

  setActiveChatId(null);
  setDocumentId("");
  localStorage.removeItem("podcast_audio");

  setFileName(file.name);
  setUploading(true);

  try {

    const formData = new FormData();
    formData.append("file", file);

    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
      "http://localhost:8000/api/documents/upload",
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const data = await res.json();
    
    const newChat: Chat = {
      id: `temp-${crypto.randomUUID()}`,
      title: file.name,
      documentId: data.document_id,
      messages: [],
    };

    setChats(prev => [newChat, ...prev]);

    setActiveChatId(newChat.id);
    setDocumentId(data.document_id);

  } catch (err) {

    console.error("Upload failed:", err);
    alert("Upload failed");

    setFileName("");

  } finally {

    setUploading(false);

  }

};

  /* ================= CHAT SELECT ================= */

  const handleSelectChat = (chat: Chat) => {

    setActiveChatId(chat.id);
    setDocumentId(chat.documentId || "");
    setFileName(chat.title); 

  };

  /* ================= DELETE CHAT ================= */

  const handleDeleteChat = async (chatId: string | number) => {

  try {

    await fetch(`http://localhost:8000/delete-chat/${chatId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    setChats(prev => prev.filter(chat => chat.id !== chatId));

    // ⭐ agar active chat delete hua hai to reset UI
    if (chatId === activeChatId) {
      setActiveChatId(null);
      setDocumentId("");
      setFileName("");
      localStorage.removeItem("active_chat_id");
      localStorage.removeItem("active_document_id");
    }

  } catch (err) {

    console.error("Delete failed:", err);

  }

};

  /* ================= REMOVE DOCUMENT ================= */

const handleDocumentRemoved = () => {

  setActiveChatId(null);
  setDocumentId("");
  setFileName("");

};

  /* ================= SEND MESSAGE ================= */

  const handleSendMessage = async (content: string, token?: string | null) => {
  

    if (!activeChatId || !documentId) return;
    setIsGenerating(true);

    const autoSave = localStorage.getItem("auto_save") !== "false";

    const jwt = token || getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setChats(prev =>
      prev.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );

    try {

      const res = await fetch(
        "http://localhost:8000/api/chat",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: content,
            document_id: documentId,
          }),
        }
      );

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      let fullText = "";

      const assistantId = crypto.randomUUID();

      setChats(prev =>
        prev.map(chat =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: "",
                  },
                ],
              }
            : chat
        )
      );
      // eslint-disable-next-line no-loop-func
      while (true) {

        const { done, value } = await reader!.read();

        if (done) break;
        setIsGenerating(false);

        const chunk = decoder.decode(value);
        fullText += chunk;

        setChats(prev =>
          prev.map(chat =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: fullText }
                      : msg
                  ),
                }
              : chat
          )
        );

      }


    if (autoSave) {
      const saveRes = await fetch("http://localhost:8000/save-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            
            question: content,
            answer: fullText,
            file_name: fileName,
            document_id: documentId,
            conversation_id: activeChatId
          })
        });

        const saved = await saveRes.json();

        /* 🔥 FIX temp conversation id */

        if (String(activeChatId).startsWith("temp-")) {

          setChats(prev =>
            prev.map(chat =>
              chat.id === activeChatId
                ? { ...chat, id: saved.conversation_id }
                : chat
            )
          );

          setActiveChatId(saved.conversation_id);

          localStorage.setItem("active_chat_id", saved.conversation_id);

        }

    }
}

     catch (err) {

      console.error("Chat error:", err);
      setIsGenerating(false);


    }

  };

  return (

    <div className={`app ${theme} ${fadeIn ? "fade-in" : ""}`}>

      <header className="app-header">
        <h1 className="app-title">DocMind</h1>

        <div className="theme-toggle">
          <div className="theme-switch-glow">
            <div
              className={`theme-switch ${theme === "dark" ? "active" : ""}`}
              onClick={() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
                localStorage.setItem("theme", newTheme);
              }}
            >
              <div className="switch-thumb" />
            </div>
          </div>
        </div>
      </header>

      <div className="main-layout">

        <div className="sidebar-wrapper glow-panel fade-item delay-1">
          <Sidebar
            chats={chats}
            onSelect={handleSelectChat}
            onUploadPDF={handleUploadPDF}
            onDeleteChat={handleDeleteChat}
            theme={theme}
            setTheme={setTheme}
            setChats={setChats} 

            setDocumentId={setDocumentId}       // 🔥 ADD
            setFileName={setFileName}           // 🔥 ADD
            setActiveChatId={setActiveChatId} 
          />
        </div>

        <div className="main-content">

          <div className="panel-grid">

            <div className="panel-container glow-panel fade-item delay-2">

              {initialLoading ? (
                <div className="skeleton-panel" />
              ) : (
                <RAGPanel
                  theme={theme}
                  documentId={documentId}
                  messages={activeChat?.messages ?? []}
                  fileName={fileName}
                  onSendMessage={handleSendMessage}
                  onDocumentUploaded={() => {}}
                  uploading={uploading}
                  onDocumentRemoved={handleDocumentRemoved}
                  isGenerating={isGenerating}
                />
              )}

            </div>

            <div className="panel-container glow-panel fade-item delay-3">

              {initialLoading ? (
                <div className="skeleton-panel" />
              ) : (
                <PodcastPanel
                  theme={theme}
                  key={documentId}
                  documentId={documentId}
                />
              )}

            </div>

          </div>

        </div>

      </div>

    </div>

  );
}

function App() {

  const [token, setToken] = useState(getToken());
  const [showDashboard, setShowDashboard] = useState(false);
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(getToken());
    };

    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
  if (token) {
    setShowDashboard(false);

    setTimeout(() => {
      setShowDashboard(true);
    }, 120); // small delay
  } else {
    setShowDashboard(false);
  }
}, [token]);

  return (
    <Routes>

      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          token
            ? (showDashboard ? <Dashboard key={token} /> : null)
            : <Navigate to="/login" />
        }
      />

      <Route path="/signup" element={<Signup />} /> 

    </Routes>

  );
}

export default App;