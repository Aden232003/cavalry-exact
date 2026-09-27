#!/bin/bash
# Render on the PC over ssh, then mux the ORIGINAL cavlry.mp4 soundtrack locally.
#   ./pc_render.sh [out-name] [workers]  -> out/<out-name>.mp4
set -e
cd "$(dirname "$0")"; P=$(pwd); ID=cavalry-exact; NAME=${1:-cavalry_exact}; W=${2:-14}
R='C:/Users/Aden/reel-render'
tar -C "$(dirname "$P")" --exclude "$ID/ref" --exclude "$ID/parts" --exclude "$ID/out" --exclude "$ID/snapshots" --exclude "._*" -czf /tmp/$ID.tgz "$ID"
ssh pc "if not exist C:\\Users\\Aden\\reel-render mkdir C:\\Users\\Aden\\reel-render"
scp -q /tmp/$ID.tgz pc:"$R/$ID.tgz"
ssh pc "cd /d C:\\Users\\Aden\\reel-render && (if exist $ID rmdir /s /q $ID) & tar -xzf $ID.tgz && cd $ID && npx --yes hyperframes@0.8.62 render --output renders/$NAME.mp4 --fps 24 --quality high -w $W > render.log 2>&1 || (type render.log & exit /b 1)"
mkdir -p out; scp -q pc:"$R/$ID/renders/$NAME.mp4" "out/${NAME}_silent.mp4"
ffmpeg -v error -y -i "out/${NAME}_silent.mp4" -i assets/audio.m4a -map 0:v -map 1:a -c:v copy -c:a copy -shortest "out/$NAME.mp4"
ffprobe -v error -show_entries stream=codec_name,width,height,duration -of compact "out/$NAME.mp4"
