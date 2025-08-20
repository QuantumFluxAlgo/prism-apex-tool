# Multi-stage build
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
RUN useradd -m prism
USER prism
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY . .
HEALTHCHECK CMD curl --fail http://localhost:8000/api/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
