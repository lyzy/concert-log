@echo off
setlocal
cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=data: update"

echo [1/4] Validating CSVs...
node scripts\validate-data.js
if errorlevel 1 goto :error

echo [2/4] Building docs/data/concert.json...
node scripts\build-data.js
if errorlevel 1 goto :error

echo [3/4] Checking translations (informational)...
node scripts\check-i18n.js

echo [4/4] Committing and pushing...
git add -A

git diff --cached --name-only > "%TEMP%\concert-update-files.txt"
findstr /v /c:"docs/data/concert.json" "%TEMP%\concert-update-files.txt" >nul
if errorlevel 1 (
  echo No content changes to commit.
  git reset >nul 2>nul
  git checkout -- docs/data/concert.json >nul 2>nul
  goto :done
)

git commit -m "%MSG%"
if errorlevel 1 goto :error

git push origin main
if errorlevel 1 goto :error

:done
del "%TEMP%\concert-update-files.txt" >nul 2>nul
echo.
echo Done.
if "%~1"=="" pause
endlocal
exit /b 0

:error
del "%TEMP%\concert-update-files.txt" >nul 2>nul
echo.
echo Update FAILED.
pause
endlocal
exit /b 1
