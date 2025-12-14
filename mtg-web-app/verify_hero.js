
import { extractEffects } from './src/utils/keywordParser.js';

const oracleText = "Whenever Hero of Bladehold attacks, create two 1/1 white Soldier creature tokens that are tapped and attacking.";
const effects = extractEffects(oracleText);

console.log("Extracted Effects:", JSON.stringify(effects, null, 2));
