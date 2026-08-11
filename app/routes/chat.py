"""Chat route blueprint.

Handles text and voice chat interactions with session management,
conversation memory, and LLM processing.
"""

import logging
import os
from datetime import datetime
from typing import Dict

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.utils import secure_filename

from app.config import AppConfig

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)


# --------------------------------------------------------------------------- #
# Helper Functions                                                            #
# --------------------------------------------------------------------------- #

def _get_session_id() -> str:
    """Get or create a unique session ID for the current user."""
    if not session.get("user_id"):
        import uuid

        session["user_id"] = str(uuid.uuid4())
        session.permanent = True

    return session["user_id"]


def _allowed_audio_file(filename: str) -> bool:
    """Check if the uploaded file has an allowed audio extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in AppConfig.ALLOWED_AUDIO_EXTENSIONS
    )


def _get_services():
    """Retrieve initialized services from the Flask app."""
    return (
        current_app.llm_service,
        current_app.memory_service,
        current_app.stt_service,
        current_app.tts_service,
    )


# --------------------------------------------------------------------------- #
# Routes                                                                      #
# --------------------------------------------------------------------------- #

@chat_bp.route("/chat", methods=["POST"])
def chat():
    """Handle text and audio chat messages.

    Accepts:
        - Text via form field 'text'
        - Audio via file upload field 'audio'

    Returns:
        JSON response containing the LLM response and optionally audio.
    """
    session_id = _get_session_id()

    llm_service, memory_service, stt_service, tts_service = _get_services()

    # ------------------------------------------------------------------ #
    # Audio Input                                                        #
    # ------------------------------------------------------------------ #

    if "audio" in request.files:
        audio_file = request.files["audio"]

        if audio_file.filename and _allowed_audio_file(audio_file.filename):
            try:
                filename = secure_filename(audio_file.filename)

                upload_path = os.path.join(
                    current_app.config["UPLOAD_FOLDER"],
                    filename,
                )

                audio_file.save(upload_path)

                # Transcribe audio using Groq Whisper
                transcription = stt_service.transcribe(upload_path)

                # Remove temporary uploaded file
                try:
                    os.remove(upload_path)
                except OSError:
                    pass

                if not transcription:
                    return jsonify({
                        "error": "Could not transcribe audio. Please try again."
                    }), 400

                # Process transcribed text
                response_data = _process_text_query(
                    session_id,
                    transcription,
                    llm_service,
                    memory_service,
                    tts_service,
                )

                response_data["transcription"] = transcription

                return jsonify(response_data)

            except Exception as exc:
                logger.error(
                    "Audio processing error [%s]: %s",
                    session_id,
                    exc,
                )

                return jsonify({
                    "error": "Audio processing failed."
                }), 500

        return jsonify({
            "error": "Invalid audio file format."
        }), 400

    # ------------------------------------------------------------------ #
    # Text Input                                                         #
    # ------------------------------------------------------------------ #

    text = request.form.get("text")

    if not text and request.is_json:
        text = request.json.get("text") if request.json else None

    if not text:
        return jsonify({
            "error": "No text provided."
        }), 400

    response_data = _process_text_query(
        session_id,
        text,
        llm_service,
        memory_service,
        tts_service,
    )

    return jsonify(response_data)


@chat_bp.route("/chat/clear", methods=["POST"])
def clear_conversation():
    """Clear the conversation history for the current session."""
    session_id = _get_session_id()

    memory_service = current_app.memory_service

    memory_service.clear_conversation(session_id)

    logger.info(
        "Conversation cleared for session %s",
        session_id,
    )

    return jsonify({
        "status": "ok",
        "message": "Conversation cleared.",
    })


@chat_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring."""
    memory_service = current_app.memory_service

    memory_healthy = memory_service.health_check()

    return jsonify({
        "status": "healthy" if memory_healthy else "degraded",
        "redis": "connected" if memory_healthy else "disconnected",
        "timestamp": datetime.utcnow().isoformat(),
    })


# --------------------------------------------------------------------------- #
# Internal Processing                                                         #
# --------------------------------------------------------------------------- #

def _process_text_query(
    session_id: str,
    user_text: str,
    llm_service,
    memory_service,
    tts_service,
) -> Dict:
    """Process a text query through the LLM pipeline.

    Steps:
        1. Retrieve conversation history.
        2. Generate response using the LLM.
        3. Save user and assistant messages to memory.
        4. Generate audio response using TTS.
    """

    # 1. Retrieve conversation history
    history = memory_service.get_conversation_history(session_id)

    # 2. Generate LLM response
    llm_result = llm_service.generate(
        user_query=user_text,
        conversation_history=history,
        session_id=session_id,
    )

    # 3. Save conversation
    memory_service.add_to_conversation(
        session_id,
        "user",
        user_text,
    )

    memory_service.add_to_conversation(
        session_id,
        "assistant",
        llm_result.text,
    )

    # 4. Generate audio response
    voice_filename = tts_service.synthesize(llm_result.text)

    result: Dict = {
        "text": llm_result.text,
        "cache": {
            "prompt_tokens": llm_result.prompt_tokens,
            "cached_tokens": llm_result.cached_tokens,
            "hit_rate": round(llm_result.cache_hit_rate, 1),
            "completion_tokens": llm_result.completion_tokens,
        },
    }

    if voice_filename:
        result["voice"] = f"/static/audio/{voice_filename}"

    return result

