import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface Props {
  onClearChats: () => void;
  onClearAll: () => void;
}

const GeneralSection: React.FC<Props> = ({ onClearChats, onClearAll }) => {

    const [autoSave, setAutoSave] = useState<boolean>(() => {
    return localStorage.getItem("auto_save") === "false" ? false : true;
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);


  

  /* ================= SAVE ================= */

  useEffect(() => {
    localStorage.setItem("auto_save", String(autoSave));
  }, [autoSave]);

  /* ================= CLEAR HISTORY ================= */
  const closeModal = () => {
  setIsClosing(true);

  setTimeout(() => {
    setShowConfirm(false);
    setIsClosing(false);
  }, 200); // CSS animation duration match
};


useEffect(() => {
  if (showConfirm) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
  }
}, [showConfirm]);



  const handleClearHistory = () => {
    localStorage.removeItem("active_chat_id");
    localStorage.removeItem("active_document_id");

    onClearAll();   // 🔥 THIS IS THE REAL FIX
  };

  return (
    <>
      <div className="settings-inner">

        {/* AUTO SAVE */}
        <div className="setting-row">
          <span>Auto Save Chats</span>

          <div
            className={`theme-switch ${autoSave ? "active" : ""}`}
            onClick={() => setAutoSave(prev => !prev)}
          >
            <div className="switch-thumb" />
          </div>
        </div>

        {/* CLEAR BUTTON */}
        <div className="setting-row danger">
          <button
            className="danger-btn"
            onClick={() => setShowConfirm(true)}
          >
            Clear Chat History
          </button>
        </div>

      </div>

      {/* ✅ PORTAL MODAL (FULL SCREEN FIX) */}
      {(showConfirm || isClosing) &&
        ReactDOM.createPortal(
          <div
            className={`confirm-overlay ${
            isClosing ? "closing" : "opening"
            }`}
          >
            <div
                className={`confirm-box ${
                isClosing ? "closing" : "opening"
            }`}
            onClick={(e) => e.stopPropagation()}
            >
              <h3>Clear all chats?</h3>
              <p>Are you sure</p>

              <div className="confirm-actions">

                <button
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  className="danger-btn"
                  onClick={() => {
                    handleClearHistory();
                    closeModal();
                  }}
                >
                  Clear
                </button>

              </div>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
};

export default GeneralSection;