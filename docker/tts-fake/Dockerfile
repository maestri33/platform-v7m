FROM python:3.12-alpine

RUN apk add --no-cache curl \
    && pip install --no-cache-dir flask==3.0.3 gunicorn==23.0.0 \
    && adduser -D -H -u 1000 tts

WORKDIR /app
COPY --chown=tts:tts app.py silence.mp3.b64 ./
RUN chown -R tts:tts /app

USER tts
EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD curl -fsS http://127.0.0.1:5000/health || exit 1

CMD ["gunicorn", "-b", "0.0.0.0:5000", "-w", "2", "--access-logfile", "-", "app:app"]
