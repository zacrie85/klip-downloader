#!/usr/bin/env bash
# Unduh semua binari Windows yang dibutuhkan folder bin/
# (dijalankan SEBELUM build karena bin/*.exe tidak di-commit ke git — ukuran >100MB)
set -e
cd "$(dirname "$0")/../bin"

echo "1/4 yt-dlp.exe ..."
curl -L -o yt-dlp.exe "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

echo "2/4 node.exe (JS runtime untuk yt-dlp) ..."
curl -L -o node.exe "https://nodejs.org/dist/v22.14.0/win-x64/node.exe"

echo "3/4 ffmpeg (BtbN win64 gpl) ..."
curl -L -o /tmp/ffmpeg-win64.zip "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

echo "4/4 ekstrak ffmpeg.exe + ffprobe.exe ..."
unzip -o -j /tmp/ffmpeg-win64.zip "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d .
rm -f /tmp/ffmpeg-win64.zip

echo "SELESAI. Isi folder bin:"
ls -la
