#!/bin/bash

# CryptoPayX Deployment Script
# This script automates the deployment process for the entire CryptoPayX platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="CryptoPayX"
BACKEND_PORT=5000
FRONTEND_PORT=3000
NODE_ENV="${NODE_ENV:-production}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 16 or higher."
        exit 1
    fi
    
    local node_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$node_version" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check Git
    if ! command_exists git; then
        print_warning "Git is not installed. Some features may not work."
    fi
    
    print_success "System requirements check passed"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        print_status "Creating backend .env file..."
        cat > backend/.env << EOF
# Server Configuration
NODE_ENV=${NODE_ENV}
PORT=${BACKEND_PORT}
FRONTEND_URL=http://localhost:${FRONTEND_PORT}

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/cryptopayx

# JWT Configuration
JWT_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=7d

# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:7545
NETWORK_ID=5777
TOKEN_CONTRACT_ADDRESS=
PAYMENT_GATEWAY_CONTRACT_ADDRESS=

# Infura Configuration (for production)
INFURA_PROJECT_ID=your_infura_project_id
MNEMONIC=your_mnemonic_phrase

# Email Configuration (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# File Upload Configuration
MAX_FILE_SIZE=10MB
UPLOAD_PATH=uploads/
EOF
        print_success "Backend .env file created"
    else
        print_warning "Backend .env file already exists"
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env" ]; then
        print_status "Creating frontend .env file..."
        cat > frontend/.env << EOF
# API Configuration
REACT_APP_API_URL=http://localhost:${BACKEND_PORT}/api

# Application Configuration
REACT_APP_APP_NAME=CryptoPayX
REACT_APP_APP_VERSION=1.0.0

# Blockchain Configuration
REACT_APP_NETWORK_ID=5777
REACT_APP_CHAIN_ID=1337

# Analytics (optional)
REACT_APP_GOOGLE_ANALYTICS_ID=
REACT_APP_SENTRY_DSN=

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_PWA=true
EOF
        print_success "Frontend .env file created"
    else
        print_warning "Frontend .env file already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_success "All dependencies installed successfully"
}

# Function to compile smart contracts
compile_contracts() {
    print_status "Compiling smart contracts..."
    
    if command_exists truffle; then
        truffle compile
        print_success "Smart contracts compiled successfully"
    else
        print_warning "Truffle not found. Installing globally..."
        npm install -g truffle
        truffle compile
        print_success "Smart contracts compiled successfully"
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    npm test || print_warning "Some backend tests failed"
    cd ..
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --coverage --watchAll=false || print_warning "Some frontend tests failed"
    cd ..
    
    # Smart contract tests
    print_status "Running smart contract tests..."
    if command_exists truffle; then
        truffle test || print_warning "Some contract tests failed"
    fi
    
    print_success "Tests completed"
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend for production..."
    cd frontend
    npm run build
    cd ..
    print_success "Frontend built successfully"
}

# Function to start services
start_services() {
    print_status "Starting CryptoPayX services..."
    
    # Start MongoDB if not running
    if ! pgrep -x "mongod" > /dev/null; then
        print_status "Starting MongoDB..."
        if command_exists systemctl; then
            sudo systemctl start mongod
        elif command_exists brew; then
            brew services start mongodb-community
        else
            print_warning "Please start MongoDB manually"
        fi
    fi
    
    # Start Redis if available
    if command_exists redis-server && ! pgrep -x "redis-server" > /dev/null; then
        print_status "Starting Redis..."
        if command_exists systemctl; then
            sudo systemctl start redis
        elif command_exists brew; then
            brew services start redis
        else
            redis-server --daemonize yes
        fi
    fi
    
    print_success "Services started"
}

# Function to deploy contracts
deploy_contracts() {
    if [ "$NODE_ENV" = "development" ]; then
        print_status "Deploying smart contracts to local network..."
        if command_exists ganache-cli; then
            # Check if Ganache is running
            if ! nc -z localhost 7545; then
                print_status "Starting Ganache CLI..."
                ganache-cli --host 0.0.0.0 --port 7545 --networkId 5777 &
                sleep 5
            fi
        else
            print_warning "Ganache CLI not found. Please start a local blockchain network."
        fi
        
        truffle migrate --reset
        print_success "Smart contracts deployed to local network"
    else
        print_warning "Contract deployment to mainnet requires manual configuration"
    fi
}

# Function to start development servers
start_dev_servers() {
    print_status "Starting development servers..."
    
    # Start backend
    print_status "Starting backend server on port ${BACKEND_PORT}..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend server on port ${FRONTEND_PORT}..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Development servers started"
    print_status "Backend: http://localhost:${BACKEND_PORT}"
    print_status "Frontend: http://localhost:${FRONTEND_PORT}"
    print_status "Press Ctrl+C to stop all servers"
    
    # Trap Ctrl+C to kill background processes
    trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
    
    # Wait for processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Function to create production build
create_production_build() {
    print_status "Creating production build..."
    
    # Build frontend
    build_frontend
    
    # Copy frontend build to backend public folder
    mkdir -p backend/public
    cp -r frontend/build/* backend/public/
    
    print_success "Production build created"
}

# Function to start production server
start_production() {
    print_status "Starting production server..."
    cd backend
    NODE_ENV=production npm start
}

# Function to show help
show_help() {
    echo "CryptoPayX Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  setup         Setup the project (install dependencies, compile contracts)"
    echo "  dev           Start development servers"
    echo "  test          Run all tests"
    echo "  build         Create production build"
    echo "  deploy        Deploy smart contracts"
    echo "  prod          Start production server"
    echo "  clean         Clean build artifacts"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup      # Initial project setup"
    echo "  $0 dev        # Start development environment"
    echo "  $0 prod       # Start production server"
}

# Function to clean build artifacts
clean_build() {
    print_status "Cleaning build artifacts..."
    
    # Clean frontend build
    rm -rf frontend/build
    rm -rf frontend/node_modules/.cache
    
    # Clean backend build
    rm -rf backend/dist
    rm -rf backend/logs/*
    
    # Clean contract artifacts
    rm -rf build/contracts/*
    
    print_success "Build artifacts cleaned"
}

# Main script logic
main() {
    echo "🚀 $PROJECT_NAME Deployment Script"
    echo "=================================="
    
    case "${1:-help}" in
        setup)
            check_requirements
            setup_environment
            install_dependencies
            compile_contracts
            print_success "Setup completed! Run '$0 dev' to start development servers."
            ;;
        dev)
            check_requirements
            start_services
            deploy_contracts
            start_dev_servers
            ;;
        test)
            run_tests
            ;;
        build)
            create_production_build
            ;;
        deploy)
            deploy_contracts
            ;;
        prod)
            check_requirements
            setup_environment
            create_production_build
            start_production
            ;;
        clean)
            clean_build
            ;;
        help|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"