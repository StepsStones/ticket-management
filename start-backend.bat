@echo off
cd /d "%~dp0backend"
echo ====================================================
echo Starting StepsStone Ticket Management Backend...
echo Connected to PostgreSQL Database: stepsstone_tickets
echo ====================================================
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
