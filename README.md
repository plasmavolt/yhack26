# DJ-on!

A gesture-controlled DJ/beat-making AR Snapchat Lens built at YHack 2026. Use hand gestures to trigger drum sounds and visual effects in real time.

## Demo

Point your camera at your hands — no tapping required.

| Gesture | Sound | Visual |
|---|---|---|
| Thumbs up | Beat | Expanding white ring |
| Pinch (thumb + index) | Scratch | Pink zigzag trail |
| Fist | Snare | Full-screen white flash |
| Peace sign | Hi-hat | Cyan radial tick burst |

Tap the screen to show help text.

## Features

- **Real-time hand tracking** — detects gestures on both hands independently
- **4 drum loop tracks** — arpeggio, break, drum & bass, drums; synchronized switching keeps the beat position intact
- **Particle effects** — canvas-drawn rings, trails, and ticks; capped at 120 particles for performance
- **One-shot samples** — bass, clap, crash, cymbal
- Front & back camera support, mobile & web compatible

## Project Structure

```
Assets/
├── Scripts/LensController.js       # Main controller — gesture → audio + visuals
├── TrackManager.js                 # Synchronized multi-track loop player
├── Audio/                          # beat, scratch, snare, hihat
├── tracks/                         # arpeggio, break, dnb, drums (WAV loops)
├── one-shots/                      # bass, clap, crash, cymbal
├── Easy Lens/                      # Experimental controller variations (v1–v7)
├── Gesture Triggers*.lspkg/        # Hand gesture detection packages
├── Audio Output - Oscillator.lspkg/
└── Grab Object With Hand.lspkg/
```

## Tech Stack

- **Lens Studio 5.19.2**
- JavaScript (ES2019)
- Canvas API — 2D particle rendering
- Lens Studio Hand Tracking & Audio Component APIs

## Getting Started

1. Open `dj.esproj` in Lens Studio 5.19.2+
2. Connect the lens to your Snapchat account via the pairing flow
3. Point the camera at your hands and try each gesture

## Repository

[github.com/plasmavolt/yhack26](https://github.com/plasmavolt/yhack26)
