
import { extractEffects } from './src/utils/keywordParser.js';

const heroText = "Whenever Hero of Bladehold attacks, create two tapped and attacking 1/1 white Soldier creature tokens.";

console.log("Parsing text:", heroText);
const effects = extractEffects(heroText);
console.log("Found effects:", effects.length);
effects.forEach((e, i) => {
    console.log(`Effect ${i + 1}:`, e.effect);
});
