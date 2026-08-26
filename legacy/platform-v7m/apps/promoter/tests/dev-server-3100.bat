@echo off
set APP_ENV=test
set BACKEND_URL=http://127.0.0.1:8765
set OMNIROUTE_BASE_URL=http://127.0.0.1:8765
set OMNIROUTE_API_KEY=e2e-key
set OMNIROUTE_EDUCATION_MODEL=e2e-education
cd /d "C:\Users\maestri33\Documents\Workspace\v7m\app-v7m"
"C:\Program Files\nodejs\node.exe" "node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3100 > "C:\Users\maestri33\Documents\Workspace\v7m\app-v7m\tests\dev-server-3100.out.log" 2> "C:\Users\maestri33\Documents\Workspace\v7m\app-v7m\tests\dev-server-3100.err.log"
