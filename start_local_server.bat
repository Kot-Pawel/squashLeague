@echo off
ECHO Server started at http://localhost:8000
ECHO Press Ctrl+C to stop the servers
"C:\Program Files\Git\bin\bash.exe" --login -i -c "cd /%DIR_GIT%/squashLeague && python -m http.server 8000"