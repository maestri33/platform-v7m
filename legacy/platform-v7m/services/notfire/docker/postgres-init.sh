#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=notify_password="$NOTIFY_DB_PASSWORD" <<'SQL'
CREATE USER notify WITH PASSWORD :'notify_password';
CREATE USER evolution WITH PASSWORD :'notify_password';
CREATE USER evogo WITH PASSWORD :'notify_password';
CREATE DATABASE notify OWNER notify;
CREATE DATABASE evolution OWNER evolution;
CREATE DATABASE evogo_auth OWNER evogo;
CREATE DATABASE evogo_users OWNER evogo;
SQL
