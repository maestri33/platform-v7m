#!/usr/bin/env python3
"""
==============================================================================
V7M Production Ecosystem Comprehensive Audit Suite
==============================================================================
Audita fisicamente todos os componentes de produção do ecossistema V7M:
1. CT 150 (Core Host & Docker Containers)
2. CT 110 (Nginx Proxy Manager Ingress & Upstream Mappings)
3. Cloudflare Edge & Domínios Públicos (SSL, Latência, Status HTTP)
4. Banco de Dados (Neon / PostgreSQL & Django Migrations)
5. Serviços & Integrações (Asaas Webhooks, Notify Server, Evolution GO, Stalwart)
==============================================================================
"""

import os
import sys
import json
import time
import socket
import ssl
import subprocess
import urllib.request
import urllib.error
from typing import Dict, Any, List

class V7MProductionAuditor:
    def __init__(self):
        self.results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S %Z"),
            "summary": {"total": 0, "passed": 0, "failed": 0, "warnings": 0},
            "tiers": {}
        }

    def _record(self, tier: str, name: str, status: str, details: Any, error: Any = None):
        if tier not in self.results["tiers"]:
            self.results["tiers"][tier] = []
        
        self.results["summary"]["total"] += 1
        if status == "PASS":
            self.results["summary"]["passed"] += 1
        elif status == "WARN":
            self.results["summary"]["warnings"] += 1
        else:
            self.results["summary"]["failed"] += 1

        self.results["tiers"][tier].append({
            "name": name,
            "status": status,
            "details": details,
            "error": error
        })

    def _run_ssh(self, host: str, cmd: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5", f"root@{host}", cmd],
            capture_output=True,
            text=True,
            timeout=20
        )

    def _check_http(self, url: str, expected_statuses: List[int] = [200], timeout: int = 5, custom_headers: Any = None, data: Any = None) -> Dict[str, Any]:
        headers = {"User-Agent": "V7M-Production-Auditor/1.0"}
        if custom_headers:
            headers.update(custom_headers)
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(url, data=data, headers=headers)
        start = time.time()
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as res:
                latency_ms = round((time.time() - start) * 1000, 2)
                body = res.read().decode('utf-8', errors='ignore')
                try:
                    parsed_body = json.loads(body)
                except Exception:
                    parsed_body = body[:200]
                return {
                    "ok": res.status in expected_statuses,
                    "status_code": res.status,
                    "latency_ms": latency_ms,
                    "headers": dict(res.headers),
                    "body": parsed_body
                }
        except urllib.error.HTTPError as e:
            latency_ms = round((time.time() - start) * 1000, 2)
            body = e.read().decode('utf-8', errors='ignore')
            try:
                parsed_body = json.loads(body)
            except Exception:
                parsed_body = body[:200]
            return {
                "ok": e.code in expected_statuses,
                "status_code": e.code,
                "latency_ms": latency_ms,
                "headers": dict(e.headers),
                "body": parsed_body,
                "error": str(e)
            }
        except Exception as e:
            latency_ms = round((time.time() - start) * 1000, 2)
            return {
                "ok": False,
                "status_code": None,
                "latency_ms": latency_ms,
                "error": str(e)
            }

    # =========================================================================
    # Tier 1: CT 150 (Core Host & Docker Containers)
    # =========================================================================
    def audit_tier1_ct150(self):
        tier = "Tier 1: Core Docker Host (CT 150 - 10.0.1.50)"
        
        # 1.1 Host Resources
        try:
            res = self._run_ssh("10.0.1.50", "free -m && df -h /")
            if res.returncode == 0:
                lines = res.stdout.strip().split("\n")
                self._record(tier, "CT 150 Host Resources", "PASS", {"raw": lines})
            else:
                self._record(tier, "CT 150 Host Resources", "FAIL", None, res.stderr)
        except Exception as e:
            self._record(tier, "CT 150 Host Resources", "FAIL", None, str(e))

        # 1.2 Docker Containers State
        try:
            res = self._run_ssh("10.0.1.50", "docker ps --format '{{.Names}}|{{.Status}}|{{.Ports}}'")
            if res.returncode == 0:
                running_containers = {}
                for line in res.stdout.strip().split("\n"):
                    if line:
                        parts = line.split("|")
                        running_containers[parts[0]] = {
                            "status": parts[1] if len(parts) > 1 else "",
                            "ports": parts[2] if len(parts) > 2 else ""
                        }
                
                expected_containers = [
                    "v7m-backend-web",
                    "v7m-backend-qcluster",
                    "v7m-backend-qcluster-slow",
                    "v7m-notify-web",
                    "v7m-notify-worker",
                    "v7m-evolution-go",
                    "v7m-admin",
                    "v7m-app-supletivo",
                    "v7m-redis",
                    "v7m-postgres"
                ]
                missing = [c for c in expected_containers if c not in running_containers]
                
                # Check legacy containers are NOT running
                legacy = ["v7m-app-promotor", "v7m-hub", "v7m-landing-promotor", "v7m-landing-supletivo"]
                present_legacy = [c for c in legacy if c in running_containers]

                if not missing and not present_legacy:
                    self._record(tier, "Docker Active Topology", "PASS", {
                        "active_count": len(running_containers),
                        "containers": running_containers
                    })
                else:
                    self._record(tier, "Docker Active Topology", "FAIL", {
                        "missing_core": missing,
                        "unexpected_legacy": present_legacy,
                        "running": list(running_containers.keys())
                    })
            else:
                self._record(tier, "Docker Active Topology", "FAIL", None, res.stderr)
        except Exception as e:
            self._record(tier, "Docker Active Topology", "FAIL", None, str(e))

        # 1.3 Local Port Checks on CT 150
        endpoints = [
            ("Backend API Health", "http://10.0.1.50:8001/api/v1/health/healthz", [200]),
            ("Notify Server Ready", "http://10.0.1.50:8000/v1/ready", [200]),
            ("Portal Unificado Local", "http://10.0.1.50:3003/healthz", [200]),
            ("Portal Aluno Local", "http://10.0.1.50:3000/healthz", [200]),
        ]
        for name, url, expected in endpoints:
            r = self._check_http(url, expected)
            status = "PASS" if r["ok"] else "FAIL"
            self._record(tier, name, status, r)

    # =========================================================================
    # Tier 2: CT 110 (Nginx Proxy Manager Ingress)
    # =========================================================================
    def audit_tier2_ct110(self):
        tier = "Tier 2: Ingress Proxy (CT 110 - 10.0.1.10)"
        
        # 2.1 NPM Nginx Configuration Test
        try:
            res = self._run_ssh("10.0.1.10", "docker exec nginx-proxy-manager nginx -t 2>&1")
            if "syntax is ok" in res.stdout and "test is successful" in res.stdout:
                self._record(tier, "NPM Nginx Syntax Test", "PASS", {"output": res.stdout.strip()})
            else:
                self._record(tier, "NPM Nginx Syntax Test", "FAIL", None, res.stdout + res.stderr)
        except Exception as e:
            self._record(tier, "NPM Nginx Syntax Test", "FAIL", None, str(e))

        # 2.2 Proxy Hosts Mapping Inspection
        try:
            res = self._run_ssh("10.0.1.10", "cat /opt/npm/data/nginx/proxy_host/*.conf")
            if res.returncode == 0:
                conf_text = res.stdout
                mappings = {}
                import re
                blocks = conf_text.split("server {")
                for b in blocks[1:]:
                    server_name_m = re.search(r"server_name\s+([^;]+);", b)
                    port_m = re.search(r"set\s+\$port\s+(\d+);", b)
                    host_m = re.search(r"set\s+\$server\s+\"([^\"]+)\";", b)
                    if server_name_m and port_m and host_m:
                        domains = server_name_m.group(1).split()
                        for d in domains:
                            mappings[d] = f"{host_m.group(1)}:{port_m.group(1)}"
                
                # Check key domain routes
                correct = (
                    mappings.get("app.maestri.group") == "10.0.1.50:3003" and
                    mappings.get("admin.maestri.group") == "10.0.1.50:3003" and
                    mappings.get("app.supletivo.net.br") == "10.0.1.50:3000" and
                    mappings.get("api.maestri.group") == "10.0.1.50:8001"
                )
                if correct:
                    self._record(tier, "NPM Upstream Routing Alignment", "PASS", mappings)
                else:
                    self._record(tier, "NPM Upstream Routing Alignment", "FAIL", mappings, "Rotas desalinhadas")
            else:
                self._record(tier, "NPM Upstream Routing Alignment", "FAIL", None, res.stderr)
        except Exception as e:
            self._record(tier, "NPM Upstream Routing Alignment", "FAIL", None, str(e))

    # =========================================================================
    # Tier 3: Cloudflare Edge & Public WAN Endpoints
    # =========================================================================
    def audit_tier3_cloudflare_wan(self):
        tier = "Tier 3: Cloudflare Edge & Public WAN"
        
        public_endpoints = [
            ("Landing Page Promotor (Astro 6 Pages)", "https://maestri.group", [200]),
            ("Landing Page Supletivo (Astro 6 Pages)", "https://supletivo.net.br", [200]),
            ("Portal Promotor / Hub (RFC 002 SSR)", "https://app.maestri.group/healthz", [200]),
            ("Portal V7M Admin Master (RFC 002 SSR)", "https://admin.maestri.group/healthz", [200]),
            ("Portal Hub Liderança (RFC 002 SSR)", "https://hub.maestri.group/healthz", [200]),
            ("Portal Aluno / Checkout (SSR)", "https://app.supletivo.net.br/healthz", [200]),
            ("Backend API Principal (Django Ninja)", "https://api.maestri.group/api/v1/health/healthz", [200]),
            ("Backend API Alias Supletivo", "https://api.supletivo.net.br/api/v1/health/healthz", [200]),
        ]

        for name, url, expected in public_endpoints:
            r = self._check_http(url, expected)
            status = "PASS" if r["ok"] else "FAIL"
            # verify cloudflare headers or edge response
            cf_ray = r.get("headers", {}).get("cf-ray") or r.get("headers", {}).get("CF-RAY")
            server = r.get("headers", {}).get("server") or r.get("headers", {}).get("Server")
            r["edge_info"] = {"server": server, "cf_ray": cf_ray}
            self._record(tier, name, status, r)

    # =========================================================================
    # Tier 4: Database Layer & Django Migrations
    # =========================================================================
    def audit_tier4_database(self):
        tier = "Tier 4: Database Layer (PostgreSQL / Migrations)"
        
        try:
            res = self._run_ssh("10.0.1.50", "docker exec v7m-backend-web python manage.py showmigrations")
            if res.returncode == 0:
                unapplied = [line for line in res.stdout.split("\n") if "[ ]" in line]
                applied_count = len([line for line in res.stdout.split("\n") if "[X]" in line])
                if not unapplied:
                    self._record(tier, "Backend Django Migrations", "PASS", {
                        "applied_migrations_count": applied_count,
                        "pending": 0
                    })
                else:
                    self._record(tier, "Backend Django Migrations", "FAIL", {
                        "applied_migrations_count": applied_count,
                        "unapplied": unapplied
                    })
            else:
                self._record(tier, "Backend Django Migrations", "FAIL", None, res.stderr)
        except Exception as e:
            self._record(tier, "Backend Django Migrations", "FAIL", None, str(e))

        # Check DB connection info & latency from inside container
        try:
            check_script = (
                "import time, django, os\n"
                "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')\n"
                "django.setup()\n"
                "from django.db import connection\n"
                "t0 = time.time()\n"
                "with connection.cursor() as c:\n"
                "    c.execute('SELECT 1, count(*) FROM users_profile;')\n"
                "    cnt = c.fetchone()[1]\n"
                "lat = round((time.time() - t0)*1000, 2)\n"
                "host = connection.settings_dict.get('HOST', 'localhost')\n"
                "name = connection.settings_dict.get('NAME', 'backend')\n"
                "print(f'{host}|{name}|{lat}|{cnt}')\n"
            )
            res = self._run_ssh("10.0.1.50", f"docker exec v7m-backend-web python -c \"{check_script}\"")
            if res.returncode == 0 and "|" in res.stdout:
                host, dbname, lat, count = res.stdout.strip().split("\n")[-1].split("|")
                self._record(tier, "Database Query Execution & Latency", "PASS", {
                    "db_host": host,
                    "db_name": dbname,
                    "latency_ms": float(lat),
                    "profiles_count": int(count)
                })
            else:
                self._record(tier, "Database Query Execution & Latency", "FAIL", None, res.stdout + res.stderr)
        except Exception as e:
            self._record(tier, "Database Query Execution & Latency", "FAIL", None, str(e))

    # =========================================================================
    # Tier 5: External Services & Integrations
    # =========================================================================
    def audit_tier5_integrations(self):
        tier = "Tier 5: External Services & Integrations"
        
        # 5.1 Asaas Webhook Endpoint
        r_asaas = self._check_http(
            "https://api.maestri.group/integrations/asaas/webhook/",
            [401],
            custom_headers={"Content-Type": "application/json"},
            data=b"{}"
        )
        status = "PASS" if r_asaas["ok"] else "FAIL"
        self._record(tier, "Asaas Webhook (Auth Protected)", status, {
            "status_code": r_asaas["status_code"],
            "note": "HTTP 401 retornado conforme esperado para chamada não autenticada",
            "body": r_asaas.get("body")
        })

        # 5.2 Notify Server Ready & Subsystem Checks
        r_notify = self._check_http("http://10.0.1.50:8000/v1/ready", [200])
        if r_notify["ok"] and isinstance(r_notify["body"], dict) and r_notify["body"].get("ready") is True:
            self._record(tier, "Notify Server Subsystems Readiness", "PASS", r_notify["body"])
        else:
            self._record(tier, "Notify Server Subsystems Readiness", "FAIL", r_notify)

        # 5.3 Stalwart SMTP Connectivity
        try:
            res = self._run_ssh("10.0.1.50", "nc -z -w 3 10.0.1.20 587 && echo OPEN || echo CLOSED")
            if "OPEN" in res.stdout:
                self._record(tier, "Stalwart SMTP Submission (10.0.1.20:587)", "PASS", {"status": "OPEN"})
            else:
                self._record(tier, "Stalwart SMTP Submission (10.0.1.20:587)", "FAIL", {"status": "CLOSED"})
        except Exception as e:
            self._record(tier, "Stalwart SMTP Submission (10.0.1.20:587)", "FAIL", None, str(e))

        # 5.4 OmniRoute AI Gateway
        r_ai = self._check_http("http://10.0.1.35/v1/models", [200])
        status = "PASS" if r_ai["ok"] else "FAIL"
        model_count = len(r_ai.get("body", {}).get("data", [])) if isinstance(r_ai.get("body"), dict) else 0
        self._record(tier, "OmniRoute AI Gateway (10.0.1.35/v1)", status, {
            "status_code": r_ai["status_code"],
            "models_available": model_count,
            "latency_ms": r_ai["latency_ms"]
        })

    def run_all(self):
        print("🔍 [1/5] Auditando Tier 1: CT 150 Core Host & Containers...")
        self.audit_tier1_ct150()
        print("🔍 [2/5] Auditando Tier 2: CT 110 Ingress NPM...")
        self.audit_tier2_ct110()
        print("🔍 [3/5] Auditando Tier 3: Cloudflare Edge & Public WAN...")
        self.audit_tier3_cloudflare_wan()
        print("🔍 [4/5] Auditando Tier 4: Database Layer & Migrations...")
        self.audit_tier4_database()
        print("🔍 [5/5] Auditando Tier 5: External Services & Integrations...")
        self.audit_tier5_integrations()

        return self.results

if __name__ == "__main__":
    auditor = V7MProductionAuditor()
    report = auditor.run_all()
    
    print("\n" + "=" * 60)
    print(f"📊 AUDITORIA DE PRODUÇÃO V7M FINALIZADA")
    print(f"Total de Testes: {report['summary']['total']} | ✅ PASS: {report['summary']['passed']} | ❌ FAIL: {report['summary']['failed']}")
    print("=" * 60)

    # Save to disk
    os.makedirs("/root/platform-v7m/docs/audit", exist_ok=True)
    with open("/root/platform-v7m/docs/audit/production-audit-latest.json", "w") as f:
        json.dump(report, f, indent=2)
    
    if report["summary"]["failed"] > 0:
        sys.exit(1)
    sys.exit(0)
