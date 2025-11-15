# LuckyDraw – Lottery Number Helper

A single-page web app that generates **random lottery-style number combinations** for fun.

> ⚠️ **Disclaimer**: This tool is for entertainment only. It does **not** predict real lottery results.

## Features

- **Game Presets**: Powerball (US), Mega Millions (US), EuroMillions (EU/UK), Classic 6/49, Custom
- **Custom Configuration**: Set main ball count/max and bonus ball count/max
- **Lucky Word Seeding**: Same word + same settings = same numbers (deterministic RNG)
- **Lock Numbers**: Keep specific numbers fixed while filling the rest randomly
- **History**: Last 10 generations saved to localStorage
- **Modern UI**: Glassmorphism design with animated number balls

## Tech Stack

- Pure **HTML + CSS + JavaScript**
- No backend or build step required
- Runs from any static host or directly from `index.html`

## Quick Start

1. Clone the repository
2. Open `index.html` in your browser
3. Select a game type and generate numbers

## File Structure

```
/
  index.html          # Main HTML shell
  README.md           # This file
  /src
    styles.css        # Glassmorphism UI styles
    app.js            # Application logic + RNG
  /assets
    (optional assets)
```

## Usage

1. **Select Game Type**: Choose from presets or create a custom configuration
2. **Enter Lucky Word** (optional): Type a phrase for deterministic number generation
3. **Lock Numbers** (optional): Enter comma-separated numbers to keep fixed
4. **Generate**: Click the button to generate your lucky numbers
5. **View History**: See your last 10 generations, persisted across sessions

## License

MIT
