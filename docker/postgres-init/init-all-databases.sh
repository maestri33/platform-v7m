#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=db_password="${POSTGRES_PASSWORD:-v7m-local-password}" <<'SQL'
CREATE USER notify WITH PASSWORD :'db_password' CREATEDB;
CREATE USER evolution WITH PASSWORD :'db_password';
CREATE USER evogo WITH PASSWORD :'db_password';
CREATE USER backend WITH PASSWORD :'db_password' CREATEDB;

CREATE DATABASE notify OWNER notify;
CREATE DATABASE evolution OWNER evolution;
CREATE DATABASE evogo_auth OWNER evogo;
CREATE DATABASE evogo_users OWNER evogo;
CREATE DATABASE backend OWNER backend;

GRANT ALL PRIVILEGES ON DATABASE notify TO notify;
GRANT ALL PRIVILEGES ON DATABASE evolution TO evolution;
GRANT ALL PRIVILEGES ON DATABASE evogo_auth TO evogo;
GRANT ALL PRIVILEGES ON DATABASE evogo_users TO evogo;
GRANT ALL PRIVILEGES ON DATABASE backend TO backend;
SQL
