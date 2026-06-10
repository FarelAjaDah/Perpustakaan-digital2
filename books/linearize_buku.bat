@echo off
:: =============================================
::  LINEARIZE BUKU — Pustaka Digital
::  Jalankan sekali, semua buku jadi lebih cepat
::  dibuka di aplikasi.
::
::  CARA PAKAI:
::  1. Download qpdf dari https://github.com/qpdf/qpdf/releases
::     Pilih file: qpdf-xx.x.x-msvc64.zip
::  2. Extract, copy qpdf.exe ke folder yang sama dengan script ini
::  3. Taruh script ini di dalam folder /books kamu
::  4. Double-click file ini
:: =============================================

setlocal enabledelayedexpansion

echo.
echo  =============================================
echo   Linearize Buku - Pustaka Digital
echo  =============================================
echo.

:: Cek apakah qpdf.exe ada
if not exist "%~dp0qpdf.exe" (
    echo  [ERROR] qpdf.exe tidak ditemukan!
    echo.
    echo  Download dulu di:
    echo  https://github.com/qpdf/qpdf/releases/latest
    echo.
    echo  Pilih file: qpdf-xx.x.x-msvc64.zip
    echo  Lalu copy qpdf.exe ke folder ini.
    echo.
    pause
    exit /b 1
)

:: Buat folder backup kalau belum ada
if not exist "%~dp0backup" (
    mkdir "%~dp0backup"
    echo  Folder backup dibuat.
)

set /a total=0
set /a sukses=0
set /a gagal=0

:: Hitung dulu berapa file PDF
for %%f in ("%~dp0*.pdf") do set /a total+=1

if %total%==0 (
    echo  [INFO] Tidak ada file PDF di folder ini.
    pause
    exit /b 0
)

echo  Ditemukan %total% file PDF.
echo  Backup disimpan di folder /backup
echo.
echo  Memulai proses...
echo  -----------------------------------------------

for %%f in ("%~dp0*.pdf") do (
    set "nama=%%~nxf"
    set "input=%%f"
    set "output=%%~dpf_temp_%%~nxf"
    set "backup=%%~dpfbackup\%%~nxf"

    echo  Memproses: !nama!

    :: Backup file asli
    copy /Y "!input!" "!backup!" >nul 2>&1

    :: Linearize dengan qpdf
    "%~dp0qpdf.exe" --linearize "!input!" "!output!" >nul 2>&1

    if !errorlevel!==0 (
        :: Ganti file asli dengan yang sudah dilinearize
        move /Y "!output!" "!input!" >nul 2>&1
        set /a sukses+=1
        echo    OK - !nama!
    ) else (
        :: Gagal - hapus temp file, biarkan asli
        if exist "!output!" del /F /Q "!output!" >nul 2>&1
        set /a gagal+=1
        echo    GAGAL - !nama! ^(file asli tidak diubah^)
    )
)

echo  -----------------------------------------------
echo.
echo  Selesai!
echo  Berhasil : %sukses% file
if %gagal% gtr 0 (
    echo  Gagal    : %gagal% file
)
echo.
echo  File asli tersimpan di folder /backup
echo  Kalau ada masalah, copy balik dari sana.
echo.
pause
