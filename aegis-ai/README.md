# AEGIS.AI

A full-stack AI-powered cyber defense dashboard. Designed to analyze and explain cyber threats such as phishing, prompt injections, and user behaviour anomalies.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS (served via Vercel)
- **Backend**: Python, FastAPI (served via Render)
- **ML Models**: HuggingFace Inference API (with rule-based fallback)

## Prerequisites
- Node.js (for frontend)
- Python 3.10+ (for backend)

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the backend directory and add your HuggingFace token:
   ```env
   HF_API_TOKEN=your_token_here
   ```
   *Note: If `HF_API_TOKEN` is missing, the backend will safely fallback to a heuristic keyword scorer.*
5. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend will be running at `http://localhost:8000`.

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the frontend directory to point to your backend:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible, usually at `http://localhost:5173`.

---

## Deployment Steps

- **Frontend (Vercel)**: Import the repository, set the Framework Preset to Vite, and set the environment variable `VITE_API_URL` to your production backend URL.
- **Backend (Render)**: Connect the repository, set the Build Command to `pip install -r requirements.txt`, and the Start Command to `uvicorn main:app --host 0.0.0.0 --port 10000`. Set `HF_API_TOKEN` as an environment variable in the Render dashboard.
