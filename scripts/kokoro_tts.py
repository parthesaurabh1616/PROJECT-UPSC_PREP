"""Local neural TTS via Kokoro (ONNX).

Runs entirely offline: no API key, no quota, no per-request cost. This is the
safety net that keeps the study system working when every cloud provider is
exhausted or unreachable.

Called by the Node TTS router, not by hand:
    python kokoro_tts.py --text-file in.txt --out out.wav --voice af_heart --speed 1.0
Text arrives as a UTF-8 file so punctuation can never break the command line.
"""
import argparse
import json
import os
import sys

CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".cache", "kokoro")
MODEL = os.path.join(CACHE, "kokoro-v1.0.onnx")
VOICES = os.path.join(CACHE, "voices-v1.0.bin")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--text-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--list-voices", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(MODEL) or not os.path.exists(VOICES):
        print(json.dumps({"error": f"kokoro model files missing in {CACHE}"}), file=sys.stderr)
        return 2

    from kokoro_onnx import Kokoro
    import soundfile as sf

    kokoro = Kokoro(MODEL, VOICES)

    if args.list_voices:
        print(json.dumps({"voices": sorted(kokoro.get_voices())}))
        return 0

    with open(args.text_file, "r", encoding="utf-8") as fh:
        text = fh.read().strip()
    if not text:
        print(json.dumps({"error": "empty text"}), file=sys.stderr)
        return 3

    samples, sample_rate = kokoro.create(text, voice=args.voice, speed=args.speed, lang="en-us")
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    sf.write(args.out, samples, sample_rate, subtype="PCM_16")

    print(json.dumps({
        "file": args.out,
        "seconds": len(samples) / sample_rate,
        "sampleRate": sample_rate,
        "voice": args.voice,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
