#!/bin/bash
set -euo pipefail

# ============================================================================
# Unified Build Script for AliFullStack
# Builds Electron binaries for macOS, Windows, and Linux
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PLATFORMS=()
CLEAN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] [PLATFORMS]

Build AliFullStack for specified platform(s).

PLATFORMS:
    mac         Build for macOS (darwin)
    win         Build for Windows (win32)
    linux       Build for Linux
    all         Build for all platforms (default)

OPTIONS:
    --clean     Clean previous builds before building
    --help      Show this help message

EXAMPLES:
    $(basename "$0")              # Build for current platform
    $(basename "$0") --all        # Build for all platforms
    $(basename "$0") --clean mac  # Clean and build for macOS
    $(basename "$0") mac win      # Build for macOS and Windows

EOF
}

detect_current_platform() {
    case "$(uname -s)" in
        Darwin*)    echo "mac" ;;
        Linux*)     echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "win" ;;
        *)          echo "unknown" ;;
    esac
}

validate_prerequisites() {
    print_header "Validating Prerequisites"
    
    local errors=0
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        errors=$((errors + 1))
    else
        local node_version=$(node --version)
        print_success "Node.js found: $node_version"
    fi
    
    # Check if npm/pnpm is available
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm not found, will use npm"
        PACKAGE_MANAGER="npm"
    else
        print_success "pnpm found"
        PACKAGE_MANAGER="pnpm"
    fi
    
    # Check if package.json exists
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "package.json not found in $PROJECT_ROOT"
        errors=$((errors + 1))
    else
        print_success "package.json found"
    fi
    
    # Check if forge.config.ts exists
    if [ ! -f "$PROJECT_ROOT/forge.config.ts" ]; then
        print_error "forge.config.ts not found in $PROJECT_ROOT"
        errors=$((errors + 1))
    else
        print_success "forge.config.ts found"
    fi
    
    # Check if node_modules exists
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        print_warning "node_modules not found. Dependencies may need to be installed."
        print_info "Run: $PACKAGE_MANAGER install"
    else
        print_success "node_modules found"
    fi
    
    if [ $errors -gt 0 ]; then
        print_error "Prerequisites validation failed with $errors error(s)"
        exit 1
    fi
    
    print_success "All prerequisites validated"
}

clean_builds() {
    print_header "Cleaning Previous Builds"
    
    cd "$PROJECT_ROOT"
    
    if [ -d "out" ]; then
        print_info "Removing out/ directory..."
        rm -rf out
        print_success "Cleaned out/ directory"
    else
        print_info "No out/ directory found"
    fi
    
    if [ -d "scaffold/node_modules" ]; then
        print_info "Removing scaffold/node_modules/ directory..."
        rm -rf scaffold/node_modules
        print_success "Cleaned scaffold/node_modules/ directory"
    else
        print_info "No scaffold/node_modules/ directory found"
    fi
    
    print_success "Clean completed"
}

build_platform() {
    local platform=$1
    local platform_flag=""
    
    case "$platform" in
        mac)
            platform_flag="--platform=mas"
            print_info "Building for macOS (darwin)..."
            ;;
        win)
            platform_flag="--platform=win32"
            print_info "Building for Windows (win32)..."
            ;;
        linux)
            platform_flag="--platform=linux"
            print_info "Building for Linux..."
            ;;
        *)
            print_error "Unknown platform: $platform"
            return 1
            ;;
    esac
    
    cd "$PROJECT_ROOT"
    
    print_info "Running: $PACKAGE_MANAGER run make $platform_flag"
    
    if $PACKAGE_MANAGER run make $platform_flag; then
        print_success "Build completed for $platform"
        return 0
    else
        print_error "Build failed for $platform"
        return 1
    fi
}

# ============================================================================
# Parse Command Line Arguments
# ============================================================================

# Check if no arguments provided
if [ $# -eq 0 ]; then
    # Default: build for current platform
    CURRENT_PLATFORM=$(detect_current_platform)
    if [ "$CURRENT_PLATFORM" = "unknown" ]; then
        print_warning "Could not detect current platform, defaulting to 'all'"
        PLATFORMS=("all")
    else
        print_info "No platform specified, building for current platform: $CURRENT_PLATFORM"
        PLATFORMS=("$CURRENT_PLATFORM")
    fi
else
    # Parse arguments
    while [[ $# -gt 0 ]]; do
      case $1 in
      --clean)
        CLEAN=true
        shift
        ;;
      --help|-h)
        show_usage
        exit 0
        ;;
      --all)
        PLATFORMS=("all")
        shift
        ;;
      mac|darwin)
        PLATFORMS+=("mac")
        shift
        ;;
      win|windows|win32)
        PLATFORMS+=("win")
        shift
        ;;
      linux)
        PLATFORMS+=("linux")
        shift
        ;;
      all)
        PLATFORMS=("all")
        shift
        ;;
      *)
        print_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
      esac
    done
fi

# If no platforms specified after parsing, default to current platform
if [ ${#PLATFORMS[@]} -eq 0 ]; then
    CURRENT_PLATFORM=$(detect_current_platform)
    if [ "$CURRENT_PLATFORM" = "unknown" ]; then
        print_warning "Could not detect current platform, defaulting to 'all'"
        PLATFORMS=("all")
    else
        PLATFORMS=("$CURRENT_PLATFORM")
    fi
fi

# ============================================================================
# Main Build Process
# ============================================================================

print_header "AliFullStack Unified Build Script"

print_info "Platforms to build: ${PLATFORMS[*]}"
print_info "Clean before build: $CLEAN"
print_info "Project root: $PROJECT_ROOT"

# Validate prerequisites
validate_prerequisites

# Clean if requested
if [ "$CLEAN" = true ]; then
    clean_builds
fi

# Determine which platforms to build
BUILD_TARGETS=()
if [[ " ${PLATFORMS[*]} " =~ " all " ]]; then
    BUILD_TARGETS=("mac" "win" "linux")
else
    BUILD_TARGETS=("${PLATFORMS[@]}")
fi

print_header "Building for Platforms: ${BUILD_TARGETS[*]}"

# Build for each platform
FAILED_PLATFORMS=()
SUCCESSFUL_PLATFORMS=()

for platform in "${BUILD_TARGETS[@]}"; do
    if build_platform "$platform"; then
        SUCCESSFUL_PLATFORMS+=("$platform")
    else
        FAILED_PLATFORMS+=("$platform")
    fi
done

# ============================================================================
# Summary
# ============================================================================

print_header "Build Summary"

if [ ${#SUCCESSFUL_PLATFORMS[@]} -gt 0 ]; then
    print_success "Successfully built for: ${SUCCESSFUL_PLATFORMS[*]}"
fi

if [ ${#FAILED_PLATFORMS[@]} -gt 0 ]; then
    print_error "Failed to build for: ${FAILED_PLATFORMS[*]}"
    echo ""
    print_error "Build process completed with errors"
    exit 1
fi

print_success "All builds completed successfully!"
print_info "Output location: $PROJECT_ROOT/out/"

exit 0
