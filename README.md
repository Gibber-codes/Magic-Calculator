# MTG Calculator

A Magic: The Gathering battlefield calculator and simulator.

## Project Structure

```
MTG-Calculator/
├── scripts/           # Python tooling (card fetching, AI mapping)
├── mockups/           # HTML/CSS prototypes
└── mtg-web-app/       # React web application
```

## Getting Started

### Web App
```bash
cd mtg-web-app
npm install
npm run dev
```

### Python Scripts
```bash
cd scripts
pip install -r requirements.txt
python scryfall_card_fetcher.py
```

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS
- **Data**: Scryfall API
