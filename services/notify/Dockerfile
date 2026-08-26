FROM python:3.12.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN addgroup --system notify && adduser --system --ingroup notify notify

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# /data e /media são mount points de volumes nomeados: precisam existir na
# imagem com dono notify, senão o volume nasce como root e o SQLite falha.
RUN mkdir -p /app/media /app/data && chown -R notify:notify /app

USER notify

EXPOSE 8000

CMD ["gunicorn", "notify_server.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-"]
