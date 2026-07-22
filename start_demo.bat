@echo off
echo ===================================================
echo     Starting KH Productivity Tracker for Demo...
echo ===================================================
echo.

echo [1/2] Starting Backend Server (Database ^& APIs)...
start "KH Backend Server" cmd /k "cd server && node index.js"

echo [2/2] Starting Frontend Server (React App)...
start "KH Frontend Server" cmd /k "cd client && npm run dev"

echo.
echo ===================================================
echo  All servers are starting in separate windows!
echo  Please wait a few seconds, then open your browser
echo  and go to: http://localhost:5173
echo ===================================================
echo.
pause
