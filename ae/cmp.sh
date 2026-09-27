#!/bin/bash
# ae/cmp.sh <part> <global frames csv>  -> scratch/cmp_<part>.jpg  (render | AE-data preview)
cd "$(dirname "$0")/.."; P=$1; L=$2; O=/private/tmp/claude-501/-Users-aden-Downloads--aden-gomes/e8597ed6-d51f-47d6-8237-6b8e119e9295/scratchpad/aeprev_$P
mkdir -p $O && node ae/preview.mjs $P $L $O >/dev/null || exit 1
args=(); for g in ${L//,/ }; do ffmpeg -v error -y -i out/cavalry_exact.mp4 -vf "select=eq(n\,$g)" -frames:v 1 $O/ren_$g.png; ffmpeg -v error -y -i $O/ren_$g.png -i $O/prev_$g.png -filter_complex "[0][1]hstack,scale=720:-1" $O/pair_$g.png; args+=(-i $O/pair_$g.png); done
n=${#args[@]}; n=$((n/2)); ffmpeg -v error -y "${args[@]}" -filter_complex "vstack=inputs=$n" /private/tmp/claude-501/-Users-aden-Downloads--aden-gomes/e8597ed6-d51f-47d6-8237-6b8e119e9295/scratchpad/cmp_$P.jpg && echo done
