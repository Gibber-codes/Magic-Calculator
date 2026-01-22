
const patterns = [
    {
        name: 'create_related_token',
        pattern: /create (?:an?|two|three|four|five|\d+) (?:\d+\/\d+ )?(?!tokens? that)[^.]*?tokens?(?: that are)?(?: tapped and attacking)?/i,
    },
    {
        name: 'create_named_token',
        pattern: /create (?:an?|two|three|four) (.*?) tokens?[\s\S]*?(?:\(It(?:'s| is) ([\s\S]*?)\))?/i,
    }
];

const text = "Whenever Hero of Bladehold attacks, create two tapped and attacking 1/1 white Soldier creature tokens.";

console.log("Testing text:", text);
patterns.forEach(p => {
    const match = text.match(p.pattern);
    if (match) {
        console.log(`Matched [${p.name}]`);
        // console.log("Match data:", match);
    } else {
        console.log(`Did NOT match [${p.name}]`);
    }
});
