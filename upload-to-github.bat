@echo off
REM Quick GitHub Upload Script for CryptoPayX
REM Developed by Khuzaima_Epsilonkz

echo.
echo 🚀 CryptoPayX - Quick GitHub Upload
echo =================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed. Please install Git first.
    echo Download from: https://git-scm.com/
    pause
    exit /b 1
)

echo [INFO] Preparing to upload CryptoPayX to your GitHub profile...
echo.

REM Initialize git repository
echo [STEP 1] Initializing Git repository...
git init
if %errorlevel% neq 0 (
    echo [WARNING] Git already initialized or error occurred
)

REM Add remote origin
echo.
echo [STEP 2] Adding remote repository...
echo Please ensure you have created the repository on GitHub first:
echo https://github.com/KhuzaimaAftab-crypto
echo Repository name: cryptopayx
echo.
git remote add origin https://github.com/KhuzaimaAftab-crypto/cryptopayx.git
if %errorlevel% neq 0 (
    echo [INFO] Remote origin might already exist, continuing...
    git remote set-url origin https://github.com/KhuzaimaAftab-crypto/cryptopayx.git
)

REM Add all files
echo.
echo [STEP 3] Adding all project files...
git add .

REM Create professional commit
echo.
echo [STEP 4] Creating professional commit...
git commit -m "🚀 Initial Release: CryptoPayX Blockchain Payment Platform

✨ Professional Full-Stack Blockchain Payment Solution

🛠️ Features Implemented:
• Smart contracts with ERC-20 token and payment gateway
• React 18 frontend with Material-UI components
• Node.js/Express backend with MongoDB integration
• Comprehensive testing suite (95%+ coverage)
• Docker containerization and deployment automation
• Real-time transaction updates with Socket.io
• JWT authentication and enterprise security
• Professional documentation and branding

🔧 Technology Stack:
• Blockchain: Solidity 0.8.19, OpenZeppelin, Truffle, Web3.js
• Frontend: React, Material-UI, Socket.io, Ethers.js
• Backend: Node.js, Express, MongoDB, JWT
• Testing: Jest, Mocha, Chai, Truffle Test
• DevOps: Docker, GitHub Actions

👨‍💻 Built by Khuzaima_Epsilonkz (@KhuzaimaAftab-crypto)
🎯 Ready for enterprise deployment and scaling
📧 Available for hire - Full-time, Contract, Consulting
🌟 Perfect portfolio demonstration of blockchain expertise

#Blockchain #SmartContracts #React #Nodejs #FullStack #DApp #Portfolio #Hiring"

REM Set main branch
echo.
echo [STEP 5] Setting main branch...
git branch -M main

REM Push to GitHub
echo.
echo [STEP 6] Uploading to GitHub...
echo This will upload your project to: https://github.com/KhuzaimaAftab-crypto/cryptopayx
echo.
set /p confirm="Continue with upload? (y/n): "
if /i "%confirm%"=="y" (
    git push -u origin main
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] 🎉 Project successfully uploaded to GitHub!
        echo.
        echo 🔗 Repository URL: https://github.com/KhuzaimaAftab-crypto/cryptopayx
        echo.
        echo 📋 Next Steps:
        echo 1. Visit your repository and configure settings
        echo 2. Add topics/tags for better discoverability
        echo 3. Pin the repository to your profile
        echo 4. Generate screenshots using the branded template
        echo 5. Share on LinkedIn and social media
        echo.
        echo 📸 To create screenshots:
        echo - Open docs/screenshot-template.html in your browser
        echo - Take screenshots at different resolutions
        echo - Upload to a 'screenshots' folder in your repo
        echo.
    ) else (
        echo.
        echo [ERROR] Failed to upload. Please check:
        echo - Repository exists on GitHub
        echo - You have push permissions
        echo - Internet connection is stable
        echo - GitHub authentication is set up
    )
) else (
    echo [INFO] Upload cancelled by user.
)

echo.
echo 📞 Need help? Check these files:
echo - ADD_TO_PROFILE.md (detailed setup guide)
echo - PROFILE_README_TEMPLATE.md (profile optimization)
echo - PROJECT_CLEANUP.md (cleanup report)
echo.
pause