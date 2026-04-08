@echo off
chcp 65001 > nul
title extensionto.com - نشر المقالات

echo.
echo =============================================================
echo    extensionto.com - نظام النشر التلقائي
echo =============================================================
echo.

:: التحقق من bun
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] bun غير مثبت!
    echo يرجى تثبيته من: https://bun.sh
    pause
    exit /b 1
)

:: التحقق من git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] git غير مثبت!
    pause
    exit /b 1
)

echo [1/4] مزامنة المقالات من Supabase إلى ملفات Markdown...
call bun run sync-db-to-md
if %errorlevel% neq 0 (
    echo.
    echo [خطأ] فشلت مزامنة قاعدة البيانات.
    echo تأكد من صحة VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY في ملف .env
    pause
    exit /b 1
)
echo [OK] اكتملت مزامنة Supabase

echo.
echo [2/4] بناء ملف الفهرس articles-index.json وتحديث sitemap...
call bun run sync-articles
if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء الفهرس.
    pause
    exit /b 1
)
echo [OK] اكتمل بناء الفهرس والـ sitemap

echo.
echo [3/4] رفع التغييرات إلى GitHub...
git add -A
git status --short
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo [تنبيه] لا توجد تغييرات جديدة للرفع.
    goto google_step
)
git commit -m "chore: publish articles - %date% %time%"
if %errorlevel% neq 0 (
    echo [خطأ] فشل الـ commit.
    pause
    exit /b 1
)
git push
if %errorlevel% neq 0 (
    echo [خطأ] فشل الـ push. تأكد من الاتصال بالإنترنت وصلاحيات git.
    pause
    exit /b 1
)
echo [OK] تم الرفع إلى GitHub - سيبدأ Vercel بالنشر تلقائياً

:google_step
echo.
echo [4/4] إرسال sitemap إلى Google Indexing API...
if exist "service-account.json" (
    call bun run index-sitemap
    if %errorlevel% neq 0 (
        echo [تنبيه] فشل إرسال sitemap إلى Google. تحقق من الصلاحيات.
    ) else (
        echo [OK] تم إرسال sitemap إلى Google
    )
) else (
    if defined GOOGLE_INDEXING_KEY (
        call bun run index-sitemap
        if %errorlevel% neq 0 (
            echo [تنبيه] فشل إرسال sitemap إلى Google.
        ) else (
            echo [OK] تم إرسال sitemap إلى Google
        )
    ) else (
        echo [تنبيه] ملف service-account.json غير موجود.
        echo         ضع ملف JSON من Google Cloud في جذر المشروع باسم service-account.json
        echo         أو أضف GOOGLE_INDEXING_KEY في ملف .env
    )
)

echo.
echo =============================================================
echo    تم الانتهاء! الموقع سيتحدث خلال دقيقتين على Vercel.
echo    تحقق من: https://vercel.com/dashboard
echo =============================================================
echo.
pause
