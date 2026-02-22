# Finance Tracker AI Service

Run a FastAPI service that reads the Finance Tracker MongoDB data and produces:
- Spending analysis
- Budget recommendations
- Anomaly detection
- Natural-language Q&A via Gemini (optional)

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` (copy from `.env.example`) and set:
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `GEMINI_API_KEY` (required for `/query`)

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `GET /health`
- `GET /insights?userId=<mongoObjectId>&days=90`
- `POST /query` with JSON `{ "userId": "...", "question": "..." }`
