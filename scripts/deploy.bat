@echo off
REM CryptoPayX Deployment Script for Windows
REM This script automates the deployment process for the entire CryptoPayX platform

setlocal enabledelayedexpansion

REM Configuration
set PROJECT_NAME=CryptoPayX
set BACKEND_PORT=5000
set FRONTEND_PORT=3000
if not defined NODE_ENV set NODE_ENV=development

echo.
echo 🚀 %PROJECT_NAME% Deployment Script for Windows
echo ==================================================

REM Function to check if command exists
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16 or higher.
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed.
    exit /b 1
)

REM Parse command line argument
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

if "%COMMAND%"=="setup" goto :setup
if "%COMMAND%"=="dev" goto :dev
if "%COMMAND%"=="test" goto :test
if "%COMMAND%"=="build" goto :build
if "%COMMAND%"=="deploy" goto :deploy
if "%COMMAND%"=="prod" goto :prod
if "%COMMAND%"=="clean" goto :clean
if "%COMMAND%"=="help" goto :help
goto :help

:setup
echo [INFO] Setting up CryptoPayX project...

REM Create environment files
call :setup_environment

echo [INFO] Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    exit /b 1
)

cd backend
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    exit /b 1
)
cd ..

cd frontend
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)
cd ..

echo [INFO] Compiling smart contracts...
where truffle >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing Truffle globally...
    npm install -g truffle
)
truffle compile

echo [SUCCESS] Setup completed! Run 'deploy.bat dev' to start development servers.
goto :end

:dev
echo [INFO] Starting development environment...

echo [INFO] Starting backend server...
cd backend
start "CryptoPayX Backend" cmd /c "npm run dev"
cd ..

timeout /t 3 /nobreak >nul

echo [INFO] Starting frontend server...
cd frontend
start "CryptoPayX Frontend" cmd /c "npm start"
cd ..

echo [SUCCESS] Development servers started
echo [INFO] Backend: http://localhost:%BACKEND_PORT%
echo [INFO] Frontend: http://localhost:%FRONTEND_PORT%
echo [INFO] Press any key to continue...
pause >nul
goto :end

:test
echo [INFO] Running tests...

echo [INFO] Running backend tests...
cd backend
npm test
cd ..

echo [INFO] Running frontend tests...
cd frontend
npm test -- --coverage --watchAll=false
cd ..

echo [INFO] Running smart contract tests...
truffle test

echo [SUCCESS] Tests completed
goto :end

:build
echo [INFO] Building frontend for production...
cd frontend
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    exit /b 1
)
cd ..

if not exist "backend\public" mkdir backend\public
xcopy /s /y frontend\build\* backend\public\

echo [SUCCESS] Production build created
goto :end

:deploy
echo [INFO] Deploying smart contracts...
where ganache-cli >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Ganache CLI not found. Please start a local blockchain network.
) else (
    echo [INFO] Starting Ganache CLI...
    start "Ganache CLI" cmd /c "ganache-cli --host 0.0.0.0 --port 7545 --networkId 5777"
    timeout /t 5 /nobreak >nul
)

truffle migrate --reset
echo [SUCCESS] Smart contracts deployed
goto :end

:prod
echo [INFO] Starting production server...
call :setup_environment
call :build
cd backend
set NODE_ENV=production
npm start
goto :end

:clean
echo [INFO] Cleaning build artifacts...
if exist "frontend\build" rmdir /s /q frontend\build
if exist "frontend\node_modules\.cache" rmdir /s /q frontend\node_modules\.cache
if exist "backend\dist" rmdir /s /q backend\dist
if exist "backend\logs" del /q backend\logs\*
if exist "build\contracts" del /q build\contracts\*
echo [SUCCESS] Build artifacts cleaned
goto :end

:help
echo CryptoPayX Deployment Script for Windows
echo.
echo Usage: deploy.bat [OPTION]
echo.
echo Options:
echo   setup         Setup the project (install dependencies, compile contracts)
echo   dev           Start development servers
echo   test          Run all tests
echo   build         Create production build
echo   deploy        Deploy smart contracts
echo   prod          Start production server
echo   clean         Clean build artifacts
echo   help          Show this help message
echo.
echo Examples:
echo   deploy.bat setup      # Initial project setup
echo   deploy.bat dev        # Start development environment
echo   deploy.bat prod       # Start production server
goto :end

:setup_environment
echo [INFO] Setting up environment variables...

REM Backend environment
if not exist "backend\.env" (
    echo [INFO] Creating backend .env file...
    (
        echo # Server Configuration
        echo NODE_ENV=%NODE_ENV%
        echo PORT=%BACKEND_PORT%
        echo FRONTEND_URL=http://localhost:%FRONTEND_PORT%
        echo.
        echo # Database Configuration
        echo MONGODB_URI=mongodb://localhost:27017/cryptopayx
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your_jwt_secret_here_change_in_production
        echo JWT_EXPIRES_IN=7d
        echo.
        echo # Blockchain Configuration
        echo BLOCKCHAIN_RPC_URL=http://localhost:7545
        echo NETWORK_ID=5777
        echo TOKEN_CONTRACT_ADDRESS=
        echo PAYMENT_GATEWAY_CONTRACT_ADDRESS=
        echo.
        echo # Infura Configuration (for production)
        echo INFURA_PROJECT_ID=your_infura_project_id
        echo MNEMONIC=your_mnemonic_phrase
    ) > backend\.env
    echo [SUCCESS] Backend .env file created
) else (
    echo [WARNING] Backend .env file already exists
)

REM Frontend environment
if not exist "frontend\.env" (
    echo [INFO] Creating frontend .env file...
    (
        echo # API Configuration
        echo REACT_APP_API_URL=http://localhost:%BACKEND_PORT%/api
        echo.
        echo # Application Configuration
        echo REACT_APP_APP_NAME=CryptoPayX
        echo REACT_APP_APP_VERSION=1.0.0
        echo.
        echo # Blockchain Configuration
        echo REACT_APP_NETWORK_ID=5777
        echo REACT_APP_CHAIN_ID=1337
    ) > frontend\.env
    echo [SUCCESS] Frontend .env file created
) else (
    echo [WARNING] Frontend .env file already exists
)
goto :eof

:end
echo.
echo Script completed.
pause