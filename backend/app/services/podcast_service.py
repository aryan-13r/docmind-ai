import json
import httpx
from pathlib import Path
from gtts import gTTS
from pydub import AudioSegment
import random


class PodcastService:

    def __init__(
        self,
        vector_store,
        audio_output_dir: Path,
        groq_api_key: str = None,
        elevenlabs_api_key: str = None,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "llama3.2:latest",
        max_duration: int = 180
    ):

        self.vector_store = vector_store
        self.audio_output_dir = audio_output_dir
        self.audio_output_dir.mkdir(parents=True, exist_ok=True)

        self.groq_api_key = groq_api_key
        self.elevenlabs_api_key = elevenlabs_api_key

        self.ollama_base_url = ollama_base_url
        self.ollama_model = ollama_model
        self.max_duration = max_duration

        self.voice_ids = {
            "Alex": "TaTeH8gDDXAFaY3iYzUs",
            "georgina": "YmvoCnZzXWP3hvUTaq5I"
        }

        print("🎙️ Podcast Service initialized")
        print("🎤 Voice Map:", self.voice_ids)
        print("ELEVENLABS KEY:", self.elevenlabs_api_key)

    # =============================
    # LLM Query
    # =============================

    def _query_llm(self, prompt: str) -> str:

        if self.groq_api_key:

            try:

                with httpx.Client(timeout=120.0) as client:

                    response = client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.7,
                            "max_tokens": 2500,
                            "response_format": {"type": "json_object"}
                        }
                    )

                    if response.status_code == 200:

                        return response.json()["choices"][0]["message"]["content"]

            except Exception as e:
                print("❌ Groq failed:", e)

        try:

            with httpx.Client(timeout=120.0) as client:

                response = client.post(
                    f"{self.ollama_base_url}/api/generate",
                    json={
                        "model": self.ollama_model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    }
                )

                if response.status_code == 200:
                    return response.json()["response"]

        except Exception as e:
            print("❌ Ollama failed:", e)

        return ""

    # =============================
    # Dialogue Generation
    # =============================

    def generate_dialogue(self, document_id: str):

        chunks = self.vector_store.get_all_chunks(document_id)

        if not chunks:
            return []

        content = "\n".join(chunks[:10])[:6000]

        prompt = f"""
Generate a SHORT podcast conversation between Alex and georgina.

- EXACTLY 6 dialogue turns total
- Alex and georgina must alternate speaking
- Each dialogue should be 1-2 sentences only
- Natural podcast discussion st

Document:
{content}

Return JSON:

{{
 "dialogue":[
   {{"speaker":"Alex","text":"..."}},
   {{"speaker":"georgina","text":"..."}}
 ]
}}
"""

        response = self._query_llm(prompt)

        try:

            parsed = json.loads(response)

            if "dialogue" in parsed:
                return parsed["dialogue"]

        except:
            pass

        return [
            {"speaker": "Alex", "text": "Welcome to the podcast."},
            {"speaker": "georgina", "text": "Today we will discuss this document."}
        ]

    # =============================
    # ElevenLabs TTS
    # =============================

    def _elevenlabs_tts(self, text, voice_id):

        if not self.elevenlabs_api_key:
            print("❌ ElevenLabs key missing")
            return None

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.elevenlabs_api_key
        }

        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2"
        }

        for attempt in range(3):

            try:

                print(f"🎤 ElevenLabs call | voice={voice_id} | attempt={attempt+1}")

                with httpx.Client(timeout=60.0) as client:

                    response = client.post(url, headers=headers, json=payload)

                    print("📡 ElevenLabs status:", response.status_code)

                    if response.status_code == 200:

                        temp = self.audio_output_dir / f"tmp_{random.randint(1000,9999)}.mp3"

                        temp.write_bytes(response.content)

                        audio = AudioSegment.from_mp3(temp)

                        temp.unlink()

                        return audio

                    else:
                        print("⚠️ ElevenLabs response:", response.text)

            except Exception as e:
                print("❌ ElevenLabs error:", e)

        print("🚨 ElevenLabs failed after retries")

        return None

    # =============================
    # Text to speech
    # =============================

    def text_to_speech(self, text, speaker):

        if not text.strip():
            return None

        voice_id = self.voice_ids.get(speaker)

    # split long text (ElevenLabs safe limit)
        max_chars = 1000
        parts = [text[i:i+max_chars] for i in range(0, len(text), max_chars)]

        final_audio = AudioSegment.empty()

        for part in parts:

            audio = self._elevenlabs_tts(part, voice_id)

            if audio is None:
                print("❌ ElevenLabs failed → STOP (no fallback)")
                return None

            final_audio += audio
            final_audio += AudioSegment.silent(duration=400)

        return final_audio

    # =============================
    # Create podcast
    # =============================

    def create_podcast(self, document_id, target_duration=None):

        dialogue = self.generate_dialogue(document_id)

        podcast_audio = AudioSegment.silent(duration=500)

        transcript_parts = []

        group_size = 2
        current_speaker = None
        buffer = []

        for item in dialogue:

            speaker = item["speaker"]
            text = item["text"]

            transcript_parts.append(f"{speaker}: {text}")

            if current_speaker is None:
                current_speaker = speaker

            if speaker != current_speaker or len(buffer) >= group_size:

                merged = " ".join(buffer)

                audio = self.text_to_speech(merged, current_speaker)

                if audio:
                    podcast_audio += audio
                    podcast_audio += AudioSegment.silent(duration=900)

                buffer = []
                current_speaker = speaker

            buffer.append(text)

        if buffer:

            merged = " ".join(buffer)

            audio = self.text_to_speech(merged, current_speaker)

            if audio:
                podcast_audio += audio

        output_path = self.audio_output_dir / f"podcast_{document_id}.mp3"

        podcast_audio.export(str(output_path), format="mp3")

        duration = len(podcast_audio) / 1000

        transcript = "\n\n".join(transcript_parts)

        return output_path, duration, transcript