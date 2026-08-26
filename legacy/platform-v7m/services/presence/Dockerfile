# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    CAPTIVE_LISTEN_HOST=0.0.0.0 \
    CAPTIVE_LISTEN_PORT=8899

COPY . .

EXPOSE 8899

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8899/health', timeout=3)" || exit 1

CMD ["python3", "agent.py", "run"]
