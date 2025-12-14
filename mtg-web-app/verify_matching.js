
const tokenNameHero = "1/1 white Soldier creature";
const scryfallHeroToken = { name: "Soldier", type_line: "Token Creature - Soldier" };

const tokenNameBio = "Lander";
const scryfallBioToken = { name: "Lander", type_line: "Token Artifact" };

const isMatch = (scryfallName, parsedName) => {
    const s = scryfallName.toLowerCase();
    const p = parsedName.toLowerCase();
    return s === p || p.includes(s) || s.includes(p);
};

console.log("Testing Hero of Bladehold Match:");
const resultHero = isMatch(scryfallHeroToken.name, tokenNameHero);
console.log(`Expected: TRUE, Actual: ${resultHero}`);

console.log("\nTesting Biotech Specialist Match:");
const resultBio = isMatch(scryfallBioToken.name, tokenNameBio);
console.log(`Expected: TRUE, Actual: ${resultBio}`);

if (resultHero && resultBio) {
    console.log("\nSUCCESS: Both matching cases pass.");
} else {
    console.log("\nFAILURE: One or more matching cases failed.");
}
