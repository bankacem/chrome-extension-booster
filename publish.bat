@echo off
chcp 65001 > nul
title ExtensionTo - Quick Publish

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          ExtensionTo - Quick Publish System             ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Check for bun
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ bun not found! Please install it from https://bun.sh
    pause
    exit /b 1
)

:: Step 1: Sync from Supabase to Markdown
echo 📡 [1/3] Syncing articles from Supabase to Markdown...
call bun run sync-db-to-md
if %errorlevel% neq 0 (
    echo ❌ Failed to sync from Supabase.
    pause
    exit /b 1
)

:: Step 2: Build Index and Sitemap
echo 📄 [2/3] Building article index and updating sitemap...
call bun run sync-articles
if %errorlevel% neq 0 (
    echo ❌ Failed to build index/sitemap.
    pause
    exit /b 1
)

:: Step 3: Notify Google Indexing API
echo 📤 [3/3] Notifying Google Indexing API...
call bun run index-sitemap
if %errorlevel% neq 0 (
    echo ⚠️  Google Indexing notification failed (check your API key).
) else (
    echo ✅ Google Indexing notification completed.
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║             ✅ Publishing pipeline finished!             ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 📌 Next Steps:
echo    1. Push your changes to GitHub/Vercel to deploy.
echo    2. Check Google Search Console in 24-48 hours.
echo.

pause
