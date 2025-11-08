#!/bin/sh
# Codex Yahoo governor – wraps curl with retry/backoff + JSONL metrics.
set -eu

: "${YF_MAX_RETRIES:=6}"
: "${YF_JITTER_MS:=1000}"
: "${YF_429_COOLDOWN_SEC:=600}"
: "${YF_METRICS_PATH:=/data/ops/yahoo-metrics.jsonl}"
: "${YF_BASE_CURL:=/usr/bin/env curl}"

TOKENS=2
LAST_S=0

now_ms() {
  echo $(( $(date +%s) * 1000 ))
}

sleep_ms() {
  ms="$1"
  [ "$ms" -le 0 ] || awk -v ms="$ms" 'BEGIN{printf "%.3f", ms/1000}' | xargs sleep
}

jitter() {
  awk -v m="$YF_JITTER_MS" 'BEGIN{srand(); print int(rand()*m)}'
}

retry_after_ms() {
  ra="$1"
  case "$ra" in
    '') echo '' ;;
    *[!0-9]*)
      ts=$(date -u -d "$ra" +%s 2>/dev/null || echo '')
      now=$(date -u +%s)
      if [ -n "$ts" ]; then
        if [ $ts -gt $now ]; then
          echo $(((ts-now)*1000))
        else
          echo 0
        fi
      else
        echo ''
      fi
      ;;
    *)
      echo $((ra*1000))
      ;;
  esac
}

metric() {
  event="$1"; code="$2"; retry="$3"; backoff="$4"; dur="$5"; url="$6"
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  dir=$(dirname "$YF_METRICS_PATH")
  [ -d "$dir" ] || mkdir -p "$dir" 2>/dev/null || true
  printf '{"ts":"%s","event":"%s","code":%s,"retry_after":"%s","backoff_ms":%s,"latency_ms":%s,"url":"%s"}\n' \
    "$ts" "$event" "${code:-null}" "${retry:-}" "${backoff:-0}" "${dur:-0}" "$url" \
    >> "$YF_METRICS_PATH" 2>/dev/null || true
}

throttle() {
  now=$(date +%s)
  if [ "$LAST_S" -ne 0 ]; then
    delta=$((now-LAST_S))
    if [ $delta -gt 0 ]; then
      TOKENS=$((TOKENS+delta))
      [ $TOKENS -gt 2 ] && TOKENS=2
    fi
  fi
  LAST_S=$now
  if [ $TOKENS -le 0 ]; then
    sleep 1
    TOKENS=1
  fi
  TOKENS=$((TOKENS-1))
}

yf_curl() {
  base="$1"; shift
  urlhash=$(printf '%s' "$*" | awk '{print $NF}' | sha1sum | awk '{print $1}')
  attempt=0
  tmp=$(mktemp -d)
  hdr="$tmp/h"
  body="$tmp/b"
  trap 'rm -rf "$tmp"' EXIT HUP INT TERM
  while :; do
    throttle
    start=$(now_ms)
    if "$base" -sS -D "$hdr" -o "$body" "$@"; then
      code=$(awk 'NR==1 && /^HTTP/{print $2}' "$hdr" 2>/dev/null)
    else
      code=""
    fi
    dur=$(( $(now_ms) - start ))
    case "$code" in
      200|204|206)
        metric ok "$code" '' 0 "$dur" "$urlhash"
        cat "$body"
        rm -rf "$tmp"
        trap - EXIT HUP INT TERM
        return 0
        ;;
      429)
        ra=$(awk -F': *' 'tolower($1)=="retry-after"{print $2; exit}' "$hdr" | tr -d '\r')
        ram=$(retry_after_ms "$ra")
        [ -z "$ram" ] && ram=$((YF_429_COOLDOWN_SEC*1000))
        back=$((ram + $(jitter)))
        metric 429 "$code" "$ra" "$back" "$dur" "$urlhash"
        ;;
      408|5??)
        base_ms=$((500<<attempt))
        [ $base_ms -gt 15000 ] && base_ms=15000
        back=$((base_ms + $(jitter)))
        metric retry "$code" '' "$back" "$dur" "$urlhash"
        ;;
      *)
        metric fail "$code" '' 0 "$dur" "$urlhash"
        rm -rf "$tmp"
        trap - EXIT HUP INT TERM
        return 1
        ;;
    esac
    attempt=$((attempt+1))
    if [ $attempt -ge $YF_MAX_RETRIES ]; then
      rm -rf "$tmp"
      trap - EXIT HUP INT TERM
      return 1
    fi
    sleep_ms "$back"
  done
}
