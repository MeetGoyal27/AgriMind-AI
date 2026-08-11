# AgriMind AI

AgriMind AI is an AI-powered agricultural assistant that helps users interact with an intelligent chatbot for agriculture-related queries. The application supports conversational interactions and integrates AI services for text, speech, and voice-based communication.

## Features

* AI-powered conversational chatbot
* Context-aware conversations
* Text-to-speech support
* Speech-to-text support
* Customizable prompts
* Web-based user interface
* LLM integration
* Conversation memory
* Flask-based backend
* Easy local deployment

## Tech Stack

* **Backend:** Python, Flask
* **AI/LLM:** Groq / LLM APIs
* **Frontend:** HTML, CSS, JavaScript
* **Speech:** Speech-to-Text and Text-to-Speech services
* **Configuration:** Environment variables
* **Deployment:** Gunicorn, Render

## Project Structure

```text
AgriMind-AI/
│
├── app/
│   ├── routes/
│   │   ├── chat.py
│   │   └── main.py
│   │
│   ├── services/
│   │   ├── llm_service.py
│   │   ├── memory_service.py
│   │   ├── prompt_manager.py
│   │   ├── stt_service.py
│   │   └── tts_service.py
│   │
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   │
│   ├── templates/
│   │   └── index.html
│   │
│   └── config.py
│
├── Sample_image/
├── .env.example
├── .gitignore
├── Dockerfile
├── gunicorn.conf.py
├── pyproject.toml
├── render.yaml
├── requirements.txt
└── run.py
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/MeetGoyal27/AgriMind-AI.git
cd AgriMind-AI
```

### 2. Create a virtual environment

Using Python:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file in the root directory.

Use `.env.example` as a reference:

```text
GROQ_API_KEY=your_api_key_here
LLM_MODEL=your_model_name
LLM_VISION_MODEL=your_vision_model
STT_MODEL=your_stt_model
TTS_MODEL=your_tts_model
```

**Never commit your `.env` file or API keys to GitHub.**

## Running the Application

Start the application with:

```bash
python run.py
```

The application will be available locally at:

```text
http://localhost:5000
```

## Application Workflow

```text
User
  ↓
Web Interface
  ↓
Flask Backend
  ↓
Chat Route
  ↓
Prompt + Conversation Memory
  ↓
LLM Service
  ↓
AI Response
  ↓
Web Interface
```

For voice interactions:

```text
User Voice
    ↓
Speech-to-Text
    ↓
LLM
    ↓
Text Response
    ↓
Text-to-Speech
    ↓
Audio Response
```

## Configuration

Application configuration is managed through environment variables and the configuration module.

Important configuration values should be stored in `.env` rather than directly inside the source code.

## Deployment

The project includes configuration files for deployment using Gunicorn and Render.

For production deployment, configure the required environment variables in the deployment platform rather than committing them to the repository.

## License

This project is licensed under the MIT License.
