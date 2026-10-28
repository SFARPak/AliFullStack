@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM Unified Build Script for AliFullStack (Windows)
REM Builds Electron binaries for macOS, Windows, and Linux
REM ============================================================================

REM Default values
set "PLATFORMS="
set "CLEAN=false"
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Colors (Windows CMD doesn't support ANSI colors by default, but we'll try)
set "RED=[31m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

REM ============================================================================
REM Helper Functions
REM ============================================================================

:print_header
echo.
echo ========================================
echo %~1
echo ========================================
echo.
goto :eof

:print_success
echo [OK] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_info
echo [INFO] %~1
goto :eof

:show_usage
echo Usage: %~nx0 [OPTIONS] [PLATFORMS]
echo.
echo Build AliFullStack for specified platform^(s^).
echo.
echo PLATFORMS:
echo     mac         Build for macOS ^(darwin^)
echo     win         Build for Windows ^(win32^)
echo     linux       Build for Linux
echo     all         Build for all platforms ^(default^)
echo.
echo OPTIONS:
echo     --clean     Clean previous builds before building
echo     --help      Show this help message
echo.
echo EXAMPLES:
echo     %~nx0              Build for current platform
echo     %~nx0 --all        Build for all platforms
echo     %~nx0 --clean mac  Clean and build for macOS
echo     %~nx0 mac win      Build for macOS and Windows
echo.
goto :eof

:detect_current_platform
REM Windows batch - always return win
echo win
goto :eof

:validate_prerequisites
call :print_header "Validating Prerequisites"

set "errors=0"

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Node.js is not installed or not in PATH"
    set /a errors+=1
) else (
    for /f "tokens=*" %%i in ('node --version') do set "node_version=%%i"
    call :print_success "Node.js found: !node_version!"
)

REM Check if npm/pnpm is available
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    call :print_warning "pnpm not found, will use npm"
    set "PACKAGE_MANAGER=npm"
) else (
    call :print_success "pnpm found"
    set "PACKAGE_MANAGER=pnpm"
)

REM Check if package.json exists
if not exist "%PROJECT_ROOT%\package.json" (
    call :print_error "package.json not found in %PROJECT_ROOT%"
    set /a errors+=1
) else (
    call :print_success "package.json found"
)

REM Check if forge.config.ts exists
if not exist "%PROJECT_ROOT%\forge.config.ts" (
    call :print_error "forge.config.ts not found in %PROJECT_ROOT%"
    set /a errors+=1
) else (
    call :print_success "forge.config.ts found"
)

REM Check if node_modules exists
if not exist "%PROJECT_ROOT%\node_modules" (
    call :print_warning "node_modules not found. Dependencies may need to be installed."
    call :print_info "Run: !PACKAGE_MANAGER! install"
) else (
    call :print_success "node_modules found"
)

if !errors! gtr 0 (
    call :print_error "Prerequisites validation failed with !errors! error^(s^)"
    exit /b 1
)

call :print_success "All prerequisites validated"
goto :eof

:clean_builds
call :print_header "Cleaning Previous Builds"

pushd "%PROJECT_ROOT%" >nul

if exist "out" (
    call :print_info "Removing out\ directory..."
    rmdir /s /q out
    call :print_success "Cleaned out\ directory"
) else (
    call :print_info "No out\ directory found"
)

if exist "scaffold\node_modules" (
    call :print_info "Removing scaffold\node_modules\ directory..."
    rmdir /s /q "scaffold\node_modules"
    call :print_success "Cleaned scaffold\node_modules\ directory"
) else (
    call :print_info "No scaffold\node_modules\ directory found"
)

call :print_success "Clean completed"
popd >nul
goto :eof

:build_platform
set "platform=%~1"
set "platform_flag="

if "%platform%"=="mac" (
    set "platform_flag=--platform=mas"
    call :print_info "Building for macOS ^(darwin^)..."
) else if "%platform%"=="win" (
    set "platform_flag=--platform=win32"
    call :print_info "Building for Windows ^(win32^)..."
) else if "%platform%"=="linux" (
    set "platform_flag=--platform=linux"
    call :print_info "Building for Linux..."
) else (
    call :print_error "Unknown platform: %platform%"
    exit /b 1
)

pushd "%PROJECT_ROOT%" >nul

call :print_info "Running: !PACKAGE_MANAGER! run make !platform_flag!"

!PACKAGE_MANAGER! run make !platform_flag!
if %errorlevel% equ 0 (
    call :print_success "Build completed for %platform%"
    popd >nul
    exit /b 0
) else (
    call :print_error "Build failed for %platform%"
    popd >nul
    exit /b 1
)

goto :eof

REM ============================================================================
REM Parse Command Line Arguments
REM ============================================================================

REM Check if no arguments provided
if "%~1"=="" (
    REM Default: build for current platform (Windows)
    call :print_info "No platform specified, building for current platform: win"
    set "PLATFORMS=win"
) else (
    REM Parse arguments
    :parse_args
    if "%~1"=="" goto :after_parse
    
    if "%~1"=="--clean" (
      set "CLEAN=true"
      shift
      goto :parse_args
    ) else if "%~1"=="--help" (
      call :show_usage
      exit /b 0
    ) else if "%~1"=="-h" (
      call :show_usage
      exit /b 0
    ) else if "%~1"=="--all" (
      set "PLATFORMS=all"
      shift
      goto :parse_args
    ) else if /i "%~1"=="mac" (
      set "PLATFORMS=!PLATFORMS! mac "
      shift
      goto :parse_args
    ) else if /i "%~1"=="darwin" (
      set "PLATFORMS=!PLATFORMS! mac "
      shift
      goto :parse_args
    ) else if /i "%~1"=="win" (
      set "PLATFORMS=!PLATFORMS! win "
      shift
      goto :parse_args
    ) else if /i "%~1"=="windows" (
      set "PLATFORMS=!PLATFORMS! win "
      shift
      goto :parse_args
    ) else if /i "%~1"=="win32" (
      set "PLATFORMS=!PLATFORMS! win "
      shift
      goto :parse_args
    ) else if /i "%~1"=="linux" (
      set "PLATFORMS=!PLATFORMS! linux "
      shift
      goto :parse_args
    ) else if /i "%~1"=="all" (
      set "PLATFORMS=all"
      shift
      goto :parse_args
    ) else (
      call :print_error "Unknown option: %~1"
      call :show_usage
      exit /b 1
    )
    
    :after_parse
)

REM If no platforms specified after parsing, default to current platform
if "!PLATFORMS!"=="" (
    call :print_info "No platform specified, building for current platform: win"
    set "PLATFORMS=win"
)

REM ============================================================================
REM Main Build Process
REM ============================================================================

call :print_header "AliFullStack Unified Build Script"

call :print_info "Platforms to build: !PLATFORMS!"
call :print_info "Clean before build: !CLEAN!"
call :print_info "Project root: %PROJECT_ROOT%"

REM Validate prerequisites
call :validate_prerequisites

REM Clean if requested
if /i "!CLEAN!"=="true" (
    call :clean_builds
)

REM Determine which platforms to build
set "BUILD_TARGETS="
echo !PLATFORMS! | findstr /i " all " >nul
if %errorlevel% equ 0 (
    set "BUILD_TARGETS=mac win linux"
) else (
    set "BUILD_TARGETS=!PLATFORMS!"
)

call :print_header "Building for Platforms: !BUILD_TARGETS!"

REM Build for each platform
set "FAILED_PLATFORMS="
set "SUCCESSFUL_PLATFORMS="

for %%p in (!BUILD_TARGETS!) do (
    call :build_platform %%p
    if !errorlevel! equ 0 (
        set "SUCCESSFUL_PLATFORMS=!SUCCESSFUL_PLATFORMS! %%p"
    ) else (
        set "FAILED_PLATFORMS=!FAILED_PLATFORMS! %%p"
    )
)

REM ============================================================================
REM Summary
REM ============================================================================

call :print_header "Build Summary"

if not "!SUCCESSFUL_PLATFORMS!"=="" (
    call :print_success "Successfully built for:!SUCCESSFUL_PLATFORMS!"
)

if not "!FAILED_PLATFORMS!"=="" (
    call :print_error "Failed to build for:!FAILED_PLATFORMS!"
    echo.
    call :print_error "Build process completed with errors"
    exit /b 1
)

call :print_success "All builds completed successfully!"
call :print_info "Output location: %PROJECT_ROOT%\out\"

exit /b 0
