# 🌱 AgriMind AI

> An AI-powered agricultural assistant that provides conversational, context-aware support through text and voice interaction.

## 📌 Overview

AgriMind AI is a web-based AI assistant designed to make agricultural information more accessible through natural language conversations.

The application combines a Flask backend with an LLM-powered response system and supporting services for conversation memory, speech-to-text, and text-to-speech.

The project follows a modular architecture where different responsibilities are separated into dedicated services. This makes the application easier to maintain, extend, and deploy.

## ✨ Features

- 💬 **AI-Powered Chat**
  - Ask agriculture-related questions using natural language.
  - Receive AI-generated responses through a conversational interface.

- 🧠 **Conversation Memory**
  - Maintains context across conversations.
  - Uses Redis when available.
  - Falls back to in-memory storage when Redis is unavailable.

- 🎙️ **Speech-to-Text**
  - Supports voice input.
  - Uses Groq Whisper for speech recognition.

- 🔊 **Text-to-Speech**
  - Converts AI-generated responses into speech.
  - Provides a voice-based interaction experience.

- 🌾 **Agriculture-Focused Assistance**
  - Designed for agriculture-related questions and discussions.

- 🌐 **Web Interface**
  - Interactive browser-based chat interface.
  - Supports both text and voice interaction.

- 🚀 **Production Deployment**
  - Deployed using Render.
  - Flask application served through Gunicorn.
  - Automatically deployed from GitHub.

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      Web Client      │
                    │    HTML / CSS / JS    │
                    └───────────┬──────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │    Flask Backend     │
                    │       Routes         │
                    └───────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ LLM Service  │  │Memory Service│  │Voice Services│
      └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
             │                  │                 │
             ▼                  ▼                 ▼
      ┌──────────────┐   ┌─────────────┐   ┌──────────────┐
      │ LLM Provider │   │Redis /      │   │Whisper / TTS │
      │              │   │Memory       │   │              │
      └──────────────┘   └─────────────┘   └──────────────┘
             │                  │                 │
             └──────────────────┼─────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │     AI Response      │
                    └──────────────────────┘