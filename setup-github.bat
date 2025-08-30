@echo off
REM CryptoPayX GitHub Repository Setup Script
REM Developed by Khuzaima_Epsilonkz
REM This script helps automate the GitHub repository creation and setup process

setlocal enabledelayedexpansion

echo.
echo 🚀 CryptoPayX GitHub Repository Setup
echo ====================================
echo 👨‍💻 Developed by Khuzaima_Epsilonkz
echo 🔗 GitHub: @KhuzaimaAftab-crypto
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed. Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Get current directory
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo [INFO] Current directory: %PROJECT_DIR%
echo.

REM Menu options
echo Choose an option:
echo 1. Initialize Git repository and prepare for GitHub
echo 2. Open screenshot template for branding
echo 3. Clean temporary files before upload
echo 4. Show repository setup instructions
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto :init_git
if "%choice%"=="2" goto :open_screenshots
if "%choice%"=="3" goto :clean_files
if "%choice%"=="4" goto :show_instructions
if "%choice%"=="5" goto :exit
goto :invalid_choice

:init_git
echo.
echo [INFO] Initializing Git repository...

REM Initialize git if not already done
if not exist ".git" (
    git init
    echo [SUCCESS] Git repository initialized
) else (
    echo [INFO] Git repository already exists
)

REM Create .gitignore if it doesn't exist
if not exist ".gitignore" (
    echo [INFO] Creating .gitignore file...
    (
        echo # Dependencies
        echo node_modules/
        echo npm-debug.log*
        echo yarn-debug.log*
        echo yarn-error.log*
        echo.
        echo # Production builds
        echo frontend/build/
        echo backend/dist/
        echo.
        echo # Environment files
        echo .env
        echo .env.local
        echo .env.development.local
        echo .env.test.local
        echo .env.production.local
        echo.
        echo # IDE files
        echo .vscode/
        echo .idea/
        echo *.swp
        echo *.swo
        echo *~
        echo.
        echo # OS files
        echo .DS_Store
        echo Thumbs.db
        echo desktop.ini
        echo.
        echo # Logs
        echo logs/
        echo *.log
        echo.
        echo # Temporary files
        echo tmp/
        echo temp/
        echo.
        echo # Contract artifacts
        echo build/contracts/*.json
        echo !build/contracts/migrations.json
        echo.
        echo # Coverage reports
        echo coverage/
        echo .nyc_output/
    ) > .gitignore
    echo [SUCCESS] .gitignore created
)

echo.
echo [INFO] Repository setup complete!
echo.
echo Next steps:
echo 1. Go to https://github.com/KhuzaimaAftab-crypto
echo 2. Create a new repository named 'cryptopayx'
echo 3. Set it to Public for portfolio visibility
echo 4. Copy and run these commands:
echo.
echo git remote add origin https://github.com/KhuzaimaAftab-crypto/cryptopayx.git
echo git add .
echo git commit -m "🚀 Initial release: CryptoPayX Blockchain Payment Platform - Professional portfolio project by Khuzaima_Epsilonkz"
echo git branch -M main
echo git push -u origin main
echo.
pause
goto :menu

:open_screenshots
echo.
echo [INFO] Opening screenshot template...
if exist "docs\screenshot-template.html" (
    start "" "docs\screenshot-template.html"
    echo [SUCCESS] Screenshot template opened in your default browser
    echo.
    echo Instructions:
    echo 1. Take screenshots of the template at different viewport sizes
    echo 2. Use browser dev tools to set specific resolutions:
    echo    - Desktop: 1920x1080
    echo    - Tablet: 768x1024  
    echo    - Mobile: 375x812
    echo 3. Save screenshots in a 'screenshots' folder
    echo 4. Name them descriptively (e.g., dashboard-desktop.png)
) else (
    echo [ERROR] Screenshot template not found at docs\screenshot-template.html
)
echo.
pause
goto :menu

:clean_files
echo.
echo [INFO] Cleaning temporary files...

REM Remove node_modules if present
if exist "node_modules" (
    echo [INFO] Removing node_modules...
    rmdir /s /q node_modules
)

if exist "frontend\node_modules" (
    echo [INFO] Removing frontend node_modules...
    rmdir /s /q frontend\node_modules
)

if exist "backend\node_modules" (
    echo [INFO] Removing backend node_modules...
    rmdir /s /q backend\node_modules
)

REM Remove build folders
if exist "frontend\build" (
    echo [INFO] Removing frontend build...
    rmdir /s /q frontend\build
)

if exist "backend\dist" (
    echo [INFO] Removing backend dist...
    rmdir /s /q backend\dist
)

REM Remove log files
if exist "logs" (
    echo [INFO] Removing log files...
    rmdir /s /q logs
)

REM Remove .env files (they shouldn't be committed)
if exist "backend\.env" (
    echo [WARNING] Found .env file in backend - this should not be committed
    echo [INFO] Please ensure your .env files are listed in .gitignore
)

if exist "frontend\.env" (
    echo [WARNING] Found .env file in frontend - this should not be committed  
    echo [INFO] Please ensure your .env files are listed in .gitignore
)

echo [SUCCESS] Cleanup complete!
echo.
pause
goto :menu

:show_instructions
echo.
echo [INFO] Opening GitHub setup instructions...
if exist "GITHUB_SETUP.md" (
    start "" "GITHUB_SETUP.md"
    echo [SUCCESS] Setup instructions opened
) else (
    echo [ERROR] GITHUB_SETUP.md not found
)
echo.
pause
goto :menu

:invalid_choice
echo.
echo [ERROR] Invalid choice. Please select 1-5.
echo.
pause

:menu
echo.
echo Press any key to return to menu or close window to exit...
pause >nul
goto :start

:exit
echo.
echo [INFO] Thank you for using CryptoPayX setup script!
echo 👨‍💻 Built by Khuzaima_Epsilonkz
echo 🔗 GitHub: @KhuzaimaAftab-crypto
echo.
pause
exit /b 0

:start
cls
echo.
echo 🚀 CryptoPayX GitHub Repository Setup
echo ====================================
echo 👨‍💻 Developed by Khuzaima_Epsilonkz
echo 🔗 GitHub: @KhuzaimaAftab-crypto
echo.

echo Choose an option:
echo 1. Initialize Git repository and prepare for GitHub
echo 2. Open screenshot template for branding
echo 3. Clean temporary files before upload
echo 4. Show repository setup instructions
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto :init_git
if "%choice%"=="2" goto :open_screenshots
if "%choice%"=="3" goto :clean_files
if "%choice%"=="4" goto :show_instructions
if "%choice%"=="5" goto :exit
goto :invalid_choice