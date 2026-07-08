import React, { useState, useRef, useEffect } from "react";
import { Send, FileText, X } from "lucide-react";
import { getToken } from "../auth/authStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ================= TYPES ================= */

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RAGPanelProps {
  theme: "light" | "dark";
  documentId: string;
  messages: Message[];
  fileName: string;
  onSendMessage: (content: string, token?: string | null) => void;
  onDocumentUploaded: (docId: string) => void;
  onDocumentRemoved: () => void;
  uploading?: boolean;
  isGenerating?: boolean;  
}

/* ================= COMPONENT ================= */

const RAGPanel: React.FC<RAGPanelProps> = ({
  theme,
  documentId,
  messages,
  fileName,
  onSendMessage,
  onDocumentRemoved,
  uploading,
  isGenerating 
  
}) => {

  const [inputMessage, setInputMessage] = useState("");
  const [removing, setRemoving] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ================= AUTO SCROLL ================= */
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, isGenerating]);

  /* ================= SEND MESSAGE ================= */

  const handleSend = () => {

    if (!inputMessage.trim() || !documentId) return;

    const token = getToken();

    onSendMessage(inputMessage, token);

    setInputMessage("");

  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {

    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }

  };

  /* ================= REMOVE PDF ================= */

  const handleRemoveDocument = () => {
  setRemoving(true);
  

  setTimeout(() => {
    onDocumentRemoved();
    setRemoving(false);
  }, 320); 
  if (removing) return;// match CSS duration
};

  /* ================= RENDER ================= */

  return (
    <div className={`rag-panel ${theme}`}>

      <div className="panel-header">
        <h2 className="panel-title">DocMind Chat</h2>
      </div>

      <div className="chat-body">

        <div
          className="messages-container"
          ref={messagesContainerRef}
        >

          {/* 📄 FILE STATUS (ChatGPT style) */}

          {fileName && (
            <div
                className={`message assistant pdf-message ${
                  removing ? "pdf-removing" : ""
                }`}
            >

              <div className="message-content pdf-message-box">

                <FileText size={16} />

                <span>{fileName}</span>

                <div className="pdf-action">
                  {uploading ? (
                    <div className="spinner-wrapper">
                    <div className="upload-spinner"></div>
                    </div>
                  ) : (
                    <button
                      className="pdf-remove btn-in"
                      onClick={handleRemoveDocument}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* PLACEHOLDER */}

          {messages.length === 0 && !fileName && (

            <div className="rag-placeholder">

              <div className="rag-placeholder-icon">
                <FileText size={64} />
              </div>

              <h3>DocMind Chat</h3>

              <p>
                Upload a PDF to start an intelligent conversation with your document.
              </p>

            </div>

          )}

          {/* CHAT MESSAGES */}

{messages.map((msg, idx) => (

  <div
    key={`${msg.role}-${idx}`}
    className={`message ${msg.role} flex ${
        msg.role === "assistant" ? "justify-start" : "justify-end"
        } ${removing ? "message-removing" : "chat-enter"}`}
  >

    <div
      className={`
        message-content
        prose prose-invert max-w-none

        px-4 py-3 rounded-2xl max-w-[85%] shadow-md

        ${msg.role === "assistant"
          ? "bg-zinc-800/60 text-zinc-200"
          : "bg-blue-600 text-white"}

        prose-headings:text-white
        prose-p:text-inherit
        prose-li:text-inherit
      `}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {msg.content}
      </ReactMarkdown>
    </div>

  </div>

))}

{isGenerating && (
  <div className="message assistant chat-enter">
    <div className="message-content typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
)}
<div ref={bottomRef} />
</div>

   {/* messages-container close here */}

        {/* INPUT */}

        <div className="input-container">

          <input
            type="text"
            placeholder={
              documentId
                ? "Ask a question about your document..."
                : "Upload a document first..."
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!documentId}
            className="message-input"
          />

          <button
            className="send-button"
            onClick={handleSend}
            disabled={!documentId || !inputMessage.trim()}
          >
            <Send size={18} />
          </button>

        </div>

      </div>

    </div>
  );
};

export default RAGPanel;