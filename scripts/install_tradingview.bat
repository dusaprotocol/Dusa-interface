@echo off
REM Fetches the TradingView charting library from the private dusaprotocol/charting_library
REM repo (licensed, must not be committed). The library is bundled from src/ and its static
REM files are served by the app itself from public/ (charting_library + datafeeds).

setlocal enabledelayedexpansion

REM Load GH_ACCESS_TOKEN from .env if it is not already set
if "%GH_ACCESS_TOKEN%"=="" if exist "..\.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("..\.env") do (
        if "%%a"=="GH_ACCESS_TOKEN" set "GH_ACCESS_TOKEN=%%~b"
    )
)
set "GH_ACCESS_TOKEN=%GH_ACCESS_TOKEN:'=%"

if "%GH_ACCESS_TOKEN%"=="" (
    echo GH_ACCESS_TOKEN not set: skipping TradingView charting library install ^(charts will be unavailable^).
    exit /b 0
)

set "OAUTH_REPOSITORY=https://oauth2:%GH_ACCESS_TOKEN%@github.com/dusaprotocol/charting_library/"

git clone -q --depth 1 "%OAUTH_REPOSITORY%" tv

if %errorlevel% == 0 (
    echo Clone succeeded
) else (
    echo Clone failed
    exit /b 1
)

call :remove_if_directory_exists "..\src\charting_library"
call :remove_if_directory_exists "..\public\charting_library"
call :remove_if_directory_exists "..\public\datafeeds"

robocopy /E "tv\charting_library" "..\public\charting_library" /NFL /NDL /NJH /NJS /nc /ns /np
robocopy /E "tv\datafeeds" "..\public\datafeeds" /NFL /NDL /NJH /NJS /nc /ns /np
robocopy /E /MOVE "tv\charting_library" "..\src\charting_library" /NFL /NDL /NJH /NJS /nc /ns /np

call :remove_if_directory_exists "tv"

exit /b 0

:remove_if_directory_exists
if exist "%~1" (
    rmdir /s /q "%~1"
)
exit /b
