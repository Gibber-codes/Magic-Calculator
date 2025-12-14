
import GameEngine from './src/utils/gameEngine.js'; // Adjust path provided we run from root

// Mock Card Definitions
const createHelm = (id) => ({
    id: id,
    name: 'Helm of the Host',
    type: 'Artifact',
    abilities: [
        {
            trigger: 'beginning_of_combat',
            condition: 'your_turn',
            effect: 'create_token_copy',
            target: 'equipped_creature'
        }
    ]
});

const createOuroboroid = (id) => ({
    id: id,
    name: 'Ouroboroid',
    type: 'Creature',
    power: '2',
    toughness: '2',
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
    console.log('--- Starting Trigger Priority Test ---');

    // Setup Board: Ouroboroid (ID 200) and Helm (ID 100)
    // Helm has LOWER ID so it normally resolves first by ID order,
    // but we want to confirm type priority works regardless of ID.
    // Let's test checking if Helm executes first even if it has HIGHER ID.

    const ouro = createOuroboroid(100);
    const helm = createHelm(200); // Higher ID

    // Attach helm to ouro
    helm.attachedTo = 100;

    const cards = [ouro, helm];
    const engine = new GameEngine(cards);

    // Simulate Phase Change
    console.log('Processing Phase Change: Combat');
    const triggers = engine.processPhaseChange('combat', true);

    console.log(`Found ${triggers.length} triggers.`);

    // Check Sort Order
    const firstTrigger = triggers[0];
    const secondTrigger = triggers[1];

    console.log(`1st Trigger Effect: ${firstTrigger.ability.effect} (Source: ${firstTrigger.source.name})`);
    console.log(`2nd Trigger Effect: ${secondTrigger.ability.effect} (Source: ${secondTrigger.source.name})`);

    let passedSort = false;
    if (firstTrigger.ability.effect === 'create_token_copy' && secondTrigger.ability.effect === 'add_counters') {
        console.log('PASS: Token creation is correctly prioritized first.');
        passedSort = true;
    } else {
        console.log('FAIL: Trigger order is incorrect.');
    }

    // Execute to verify logical result (Token should receive counters)
    let currentCards = [...cards];
    triggers.forEach((t, i) => {
        currentCards = t.execute(currentCards);
    });

    const token = currentCards.find(c => c.isToken);

    if (token) {
        console.log(`Token created: ${token.name}`);
        console.log(`Token counters: ${token.counters}`);

        // Logic check:
        // 1. Helm creates token (Copy of Ouroboroid).
        // 2. Ouroboroid trigger (add X counters to ALL creatures).
        // Since token exists when #2 runs, it should have counters.
        // X = Ouroboroid power (2).

        if (token.counters === 2) {
            console.log('PASS: Token received counters correctly.');
        } else {
            console.log(`FAIL: Token has ${token.counters} counters. Expected 2.`);
            // If it resolved in wrong order (counters first), token wouldn't exist when counters were added.
        }
    } else {
        console.log('FAIL: No token created.');
    }
}

runTest();
