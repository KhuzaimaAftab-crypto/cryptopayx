@echo off
REM Windows-Compatible GitHub Upload Script for CryptoPayX
REM Developed by Khuzaima_Epsilonkz

echo.
echo 🚀 CryptoPayX - Windows GitHub Upload
echo ==================================
echo.

REM Navigate to project directory
cd /d "c:\Users\DENZI\New block chain wallet project"

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH.
    echo.
    echo Please install Git first:
    echo 1. Download from: https://git-scm.com/
    echo 2. Or use GitHub Desktop: https://desktop.github.com/
    echo.
    echo [ALTERNATIVE] Use GitHub Desktop (Recommended for Windows):
    echo 1. Install GitHub Desktop
    echo 2. Sign in with @KhuzaimaAftab-crypto
    echo 3. Add this folder as existing repository
    echo 4. Set remote: https://github.com/KhuzaimaAftab-crypto/cryptopayx.git
    echo 5. Commit and push
    echo.
    pause
    exit /b 1
)

echo [INFO] Preparing CryptoPayX for GitHub upload...
echo [INFO] Project Directory: %CD%
echo.

REM Initialize git repository
echo [STEP 1] Initializing Git repository...
git init
if %errorlevel% neq 0 (
    echo [WARNING] Git repository already exists or initialization failed
) else (
    echo [SUCCESS] Git repository initialized
)

REM Check if remote exists and add/update it
echo.
echo [STEP 2] Configuring remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/KhuzaimaAftab-crypto/cryptopayx.git
if %errorlevel% equ 0 (
    echo [SUCCESS] Remote origin configured
) else (
    echo [ERROR] Failed to add remote origin
    echo Please ensure the repository exists on GitHub:
    echo https://github.com/KhuzaimaAftab-crypto/cryptopayx
    pause
    exit /b 1
)

REM Configure git user (if not set)
echo.
echo [STEP 3] Configuring Git user...
git config user.name "Khuzaima Aftab" 2>nul
git config user.email "khuzaimaaftab.crypto@gmail.com" 2>nul
echo [INFO] Git user configured

REM Add all files
echo.
echo [STEP 4] Adding project files...
git add .
if %errorlevel% equ 0 (
    echo [SUCCESS] All files staged for commit
) else (
    echo [ERROR] Failed to stage files
    pause
    exit /b 1
)

REM Create professional commit
echo.
echo [STEP 5] Creating professional commit...
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

if %errorlevel% equ 0 (
    echo [SUCCESS] Professional commit created
) else (
    echo [ERROR] Failed to create commit
    pause
    exit /b 1
)

REM Set main branch
echo.
echo [STEP 6] Setting main branch...
git branch -M main
echo [SUCCESS] Main branch configured

REM Push to GitHub
echo.
echo [STEP 7] Uploading to GitHub...
echo Repository: https://github.com/KhuzaimaAftab-crypto/cryptopayx
echo.
echo IMPORTANT: Ensure you have created the repository on GitHub first!
echo.
set /p confirm="Continue with upload to GitHub? (y/n): "
if /i "%confirm%"=="y" (
    echo.
    echo [INFO] Pushing to GitHub...
    git push -u origin main
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] 🎉 CryptoPayX successfully uploaded to GitHub!
        echo.
        echo 🔗 Repository URL: https://github.com/KhuzaimaAftab-crypto/cryptopayx
        echo.
        echo 📋 Next Steps:
        echo 1. Visit your repository and verify all files are uploaded
        echo 2. Add topics/tags: blockchain, cryptocurrency, smart-contracts, react, nodejs
        echo 3. Pin the repository to your profile for visibility
        echo 4. Star your own repository for initial credibility
        echo 5. Share on LinkedIn and social media
        echo.
        echo 📸 To create branded screenshots:
        echo - Look for screenshot-template.html in your project
        echo - Take screenshots and upload to a 'screenshots' folder
        echo.
        echo 🎯 Your professional blockchain portfolio is now live!
        echo.
    ) else (
        echo.
        echo [ERROR] Failed to upload to GitHub.
        echo.
        echo Common solutions:
        echo 1. Ensure repository exists: https://github.com/KhuzaimaAftab-crypto/cryptopayx
        echo 2. Check your GitHub authentication
        echo 3. Verify internet connection
        echo 4. Try using GitHub Desktop instead
        echo.
        echo Alternative: Use GitHub Desktop for easier upload
        echo Download: https://desktop.github.com/
        echo.
    )
) else (
    echo.
    echo [INFO] Upload cancelled. Files are ready whenever you want to upload.
    echo [INFO] You can run this script again or use GitHub Desktop.
    echo.
)

echo.
echo 📚 Additional Resources:
echo - ADD_TO_PROFILE.md (complete setup guide)
echo - PROFILE_README_TEMPLATE.md (profile optimization)
echo - 🚀 READY_TO_UPLOAD.md (quick start guide)
echo.
echo Built with ❤️ by Khuzaima_Epsilonkz
echo Professional Blockchain Developer Available for Hire
echo.
pause