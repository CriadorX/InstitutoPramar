@echo off
echo ===================================================
echo      Instituto Pramar - Git Sync Automation
echo ===================================================
echo.

echo 1. Pulling latest changes (rebase)...
git pull --rebase
if %errorlevel% neq 0 (
    echo Error pulling changes. Please resolve conflicts manually.
    pause
    exit /b %errorlevel%
)
echo.

echo 2. Staging all changes...
git add .
echo.

set /p commit_msg="Enter commit message (Press Enter for auto-generated): "
if "%commit_msg%"=="" set commit_msg="Auto-update: %date% %time%"

echo 3. Committing with message: "%commit_msg%"...
git commit -m "%commit_msg%"
echo.

echo 4. Pushing to remote...
git push
if %errorlevel% neq 0 (
    echo Error pushing changes. Please check your connection or permissions.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo              Sync Complete!
echo ===================================================
pause
