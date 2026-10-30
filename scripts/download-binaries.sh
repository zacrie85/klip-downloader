#!/usr/bin/env bash
# Unduh semua binari Windows yang dibutuhkan folder bin/
# (dijalankan SEBELUM build karena bin/*.exe tidak di-commit ke git — ukuran >100MB)
set -e
cd "$(dirname "$0")/../bin"

echo "1/4 yt-dlp.exe ..."
curl -L -o yt-dlp.exe "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

echo "2/4 node.exe (JS runtime untuk yt-dlp) ..."
curl -L -o node.exe "https://nodejs.org/dist/v22.14.0/win-x64/node.exe"

echo "3/4 ffmpeg (GyanD codexffmpeg RELEASE STABIL — bukan nightly) ..."
# v1.5.3: sebelumnya pakai BtbN ffmpeg-master-latest (nightly, bisa mengandung
# regresi — diduga penyebab "Error opening output files: Invalid argument" saat
# merge DASH BiliBili). Kini dipin ke rilis stabil resmi ffmpeg.
FFMPEG_VER="9.0.2"
curl -L -o /tmp/ffmpeg-win64.zip "https://github.com/GyanD/codexffmpeg/releases/download/${FFMPEG_VER}/ffmpeg-${FFMPEG_VER}-full_build.zip"

echo "4/4 ekstrak ffmpeg.exe + ffprobe.exe ..."
unzip -o -j /tmp/ffmpeg-win64.zip "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d .
rm -f /tmp/ffmpeg-win64.zip

echo "SELESAI. Isi folder bin:"
ls -la
