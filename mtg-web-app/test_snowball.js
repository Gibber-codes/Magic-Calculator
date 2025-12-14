
import GameEngine from './src/utils/gameEngine.js'; // Adjust path as needed provided we run from root

// Mock Ouroboroid Card
const createOuroboroid = (id) => ({
    id: id,
    name: 'Ouroboroid',
    type: 'Creature',
    power: '1',
    toughness: '1',
    counters: 0,
    abilities: [
        {
            trigger: 'beginning_of_combat',
            condition: 'your_turn',
            effect: 'add_counters',
            target: 'all_creatures_you_control',
            amount: 'this.power'
        }
    ]
});

// Run Test
async function runTest() {
    console.log('--- Starting Snowball Test ---');

    // Setup Board: 2 Ouroboroids
    const cards = [
        createOuroboroid(100),
        createOuroboroid(101)
    ];

    const engine = new GameEngine(cards);

    // Simulate Phase Change
    console.log('Processing Phase Change: Combat');
    const triggers = engine.processPhaseChange('combat', true);

    console.log(`Found ${triggers.length} triggers.`);

    // Execute Triggers Sequentially (Simulating App.jsx loop)
    let currentCards = [...cards];

    triggers.forEach((trigger, index) => {
        console.log(`\n-- Executing Trigger ${index + 1} (Source ID: ${trigger.source.id}) --`);
        currentCards = trigger.execute(currentCards);

        // Check state after trigger
        const c1 = currentCards.find(c => c.id === 100);
        const c2 = currentCards.find(c => c.id === 101);
        console.log(`State after T${index + 1}:`);
        console.log(`  Ouro 1: Power ${parseInt(c1.power) + c1.counters} (Counters: ${c1.counters})`);
        console.log(`  Ouro 2: Power ${parseInt(c2.power) + c2.counters} (Counters: ${c2.counters})`);
    });

    console.log('\n--- Final Results ---');
    const c1 = currentCards.find(c => c.id === 100);
    const expectedCounters = 3; // 1 (from first) + 2 (from second, because it got buffed)

    if (c1.counters === expectedCounters) {
        console.log(`SUCCESS: Counters are ${c1.counters}. Snowballing executing correctly.`);
    } else {
        console.log(`FAILURE: Counters are ${c1.counters}. Expected ${expectedCounters}. Snowballing failed.`);
    }
}

runTest();
