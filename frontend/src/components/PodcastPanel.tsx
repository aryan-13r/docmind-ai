import React, { useState, useRef } from "react";
import { Play, Pause, Download, Loader, Mic2 } from "lucide-react";
import axios from "axios";
import "./PodcastPanel.css";
import { getToken } from "../auth/authStore";
import { API_BASE_URL } from "../config/api";

interface PodcastPanelProps {
  theme: "light" | "dark";
  documentId: string;
}

const PodcastPanel: React.FC<PodcastPanelProps> = ({ theme, documentId }) => {

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement>(null);


  /* ================= GENERATE PODCAST ================= */

  const handleGeneratePodcast = async () => {

    if (!documentId) {
      alert("Please upload a document first!");
      return;
    }

    setIsGenerating(true);

    try {

      const token = getToken();

      console.log("JWT TOKEN:", token);

      const headers: any = {};

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/podcast/generate`,
        {
          document_id: documentId,
          duration: 180
        },
        { headers }
      );

      const audioUrl = token
        ? `${API_BASE_URL}${response.data.audio_url}?token=${token}`
        : `${API_BASE_URL}${response.data.audio_url}`;

      console.log("🎧 Podcast audio URL:", audioUrl);
      console.log("📜 Transcript:", response.data.transcript);

      setPodcastUrl(audioUrl);
      setTranscript(response.data.transcript);
      setDuration(response.data.duration);

      /* reload audio */

      setTimeout(() => {

        if (audioRef.current) {
          audioRef.current.load();
        }

      }, 100);

    } catch (error: any) {

      console.error("❌ Podcast generation error:", error);

      const backendError =
        error?.response?.data?.detail || "Failed to generate podcast.";

      alert(backendError);

    } finally {

      setIsGenerating(false);

    }

  };


  /* ================= PLAY / PAUSE ================= */

  const togglePlayPause = () => {

    if (!audioRef.current) return;

    if (isPlaying) {

      audioRef.current.pause();
      setIsPlaying(false);

    } else {

      audioRef.current.play().catch((err) => {
        console.error("Audio play error:", err);
      });

      setIsPlaying(true);

    }

  };


  /* ================= DOWNLOAD ================= */

  const handleDownload = () => {

    if (!podcastUrl) return;

    const link = document.createElement("a");

    link.href = podcastUrl;
    link.download = `podcast_${documentId}.mp3`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  };


  /* ================= FORMAT TIME ================= */

  const formatDuration = (seconds: number): string => {

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;

  };


  /* ================= UI ================= */

  return (
    <div className={`podcast-panel ${theme}`}>

      <div className="panel-header">
        <h2 className="panel-title">Podcast Generator</h2>
      </div>

      <div className="podcast-content">

        {!podcastUrl ? (

          <div className="generate-section">

            <div className="podcast-icon">
              <Mic2 size={64} />
            </div>

            <p className="podcast-description">
              Generate an engaging podcast conversation about your document
              with AI hosts Alex and georgina
            </p>

            <button
              className="generate-button"
              onClick={handleGeneratePodcast}
              disabled={!documentId || isGenerating}
            >

              {isGenerating ? (
                <>
                  <Loader className="spin" size={20} />
                  Generating Podcast...
                </>
              ) : (
                <>
                  <Mic2 size={20} />
                  Generate Podcast
                </>
              )}

            </button>

            {!documentId && (
              <p className="warning-text">
                Upload a document first to generate a podcast
              </p>
            )}

          </div>

        ) : (

          <div className="player-section">

            {/* AUDIO PLAYER */}

            <div className="audio-player">

              <audio
                ref={audioRef}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  console.error("❌ Audio failed to load:", podcastUrl);
                  alert("Audio failed to load");
                }}
              >
                <source src={podcastUrl} type="audio/mpeg" />
              </audio>

              <div className="player-controls">

                <button className="play-button" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                </button>

                <div className="player-info">
                  <span className="duration">
                    {formatDuration(duration)}
                  </span>
                </div>

                <button
                  className="download-button"
                  onClick={handleDownload}
                >
                  <Download size={24} />
                </button>

              </div>

            </div>


            {/* TRANSCRIPT */}

            <div className="transcript-section">

              <h3 className="transcript-title">Transcript</h3>

              <div className="transcript-content">

                {transcript.split("\n\n").map((line, index) => {

                  const [speaker, ...textParts] = line.split(": ");
                  const text = textParts.join(": ");

                  return (
                    <div key={index} className="transcript-line">

                      <span className="speaker">{speaker}:</span>
                      <span className="text">{text}</span>

                    </div>
                  );

                })}

              </div>

            </div>


            {/* REGENERATE */}

            <button
              className="regenerate-button"
              onClick={handleGeneratePodcast}
              disabled={isGenerating}
            >

              {isGenerating ? (
                <>
                  <Loader className="spin" size={20} />
                  Regenerating...
                </>
              ) : (
                "Regenerate Podcast"
              )}

            </button>

          </div>

        )}

      </div>

    </div>
  );

};

export default PodcastPanel;