# Mastering the stack during Magic: The Gathering's combat phase

**Combat damage no longer uses the stack**—this fundamental change from 2009 reshaped how Magic players must approach combat timing. The combat phase contains five distinct steps, each with specific priority windows where players can cast spells and activate abilities, but the crucial turn-based actions like declaring attackers, declaring blockers, and dealing damage happen instantaneously without stack interaction. Understanding exactly when you can intervene—and when you cannot—separates competent players from those who miss critical timing windows.

## The five combat steps and their priority structure

The combat phase follows a strict sequence: **Beginning of Combat**, **Declare Attackers**, **Declare Blockers**, **Combat Damage**, and **End of Combat**. Each step follows the same pattern: turn-based actions occur first (automatically, without using the stack), then triggered abilities go on the stack, and finally the active player receives priority.

The Beginning of Combat step exists primarily for spells and abilities that must occur "before attackers are declared." In multiplayer games, the active player chooses a defending player here as a turn-based action. Both players receive priority, making this the **last opportunity to tap down potential attackers** or activate abilities on creatures you want to attack with.

During Declare Attackers, the active player declares all attacking creatures as a single atomic action—you cannot respond "in the middle" of this declaration. The creatures tap (unless they have vigilance), and "whenever this creature attacks" triggers go on the stack. Only after this entire process completes does the active player receive priority. The Declare Blockers step mirrors this: the defending player declares all blockers simultaneously, damage assignment orders are announced for multiply-blocked creatures, and "whenever this creature blocks" triggers go on the stack before priority passes.

The Combat Damage step is where the M10 rules change matters most. Damage assignment and dealing happen as **one uninterruptible turn-based action**. There is no window between assigning damage and dealing it—the last chance to cast combat tricks is during the declare blockers step. After damage resolves, triggered abilities from damage (like "whenever this creature deals combat damage to a player") go on the stack, and players receive priority again.

## How stack resolution works in each step

When both players have passed priority with an empty stack, the game advances to the next step. When spells or abilities are on the stack, they resolve one at a time, with the active player regaining priority after each resolution. This creates tactical depth: casting Giant Growth on your blocked creature puts it on the stack, your opponent can respond with removal, and spells resolve last-in-first-out.

A critical distinction separates stackable events from turn-based actions. **Turn-based actions cannot be responded to**: declaring attackers happens, then you get priority. You cannot say "in response to you declaring attackers, I tap your creature"—the declaration already happened. However, triggered abilities from these actions do use the stack normally.

Consider this sequence: you attack with a creature that has "whenever this creature attacks, draw a card." The trigger goes on the stack after attackers are declared. Your opponent can respond to that trigger with instant-speed removal—your creature dies, but you still draw the card because the trigger is independent of the source once it's on the stack.

## Common scenarios that define combat mastery

**Pump spells like Giant Growth** demonstrate optimal timing. If your 2/2 is blocked by a 3/3, casting Giant Growth after blockers are declared transforms your creature into a 5/5 that survives and kills the blocker. Critically, waiting until after combat damage is too late—your creature has already received lethal damage, and state-based actions will destroy it before your pump spell resolves.

**Removing blockers after blocks are declared** creates a counterintuitive situation that confuses many players. If your 4/4 attacker is blocked by a 2/2, and you Lightning Bolt the blocker before damage, your attacker remains **blocked** for the rest of combat. Without trample, it deals zero damage to the defending player. The creature was blocked, and nothing changes that status retroactively. However, a trampling attacker treats the removed blocker as requiring zero damage to kill, so all damage goes through to the player.

**Flash creatures entering during combat** require understanding the gap between steps. You must cast your flash creature during the declare attackers step, let it resolve, and then both players pass priority to move to declare blockers—only then can your creature block. Your opponent gets priority after your flash creature resolves, meaning they can remove it before you ever declare it as a blocker.

## First strike and double strike create additional timing windows

When any creature has first strike or double strike, the combat damage step splits into two separate steps. First strike creatures deal damage in the first step; creatures without first strike deal damage in the second step. Double strike creatures deal damage in both steps. **Priority exists between these two damage steps**, creating a unique window for spells and abilities.

This timing matters for combat tricks. If your 3/2 first striker kills a 2/2 blocker in the first damage step, the blocker never deals its damage—it's already dead. If you give a creature first strike during the declare blockers step, you can have it kill threats before they strike back. The window between damage steps also allows you to grant trample to a double striker whose blocker died in first strike, letting the second hit go directly to the player.

## The M10 revolution and November 2024's final cleanup

The **Magic 2010 rules change** (July 2009) fundamentally altered combat by removing damage from the stack. Previously, combat damage was assigned, placed on the stack as an object, and players could respond before it resolved. This enabled powerful tricks: Mogg Fanatic could block a 2/2, put its 1 damage on the stack, sacrifice itself to deal 1 more damage, and the original combat damage would still resolve—killing the 2/2. Morphling could pump to 5/1 for maximum damage, then shrink back to survive after damage was "locked in."

Wizards removed this because it violated player intuition. A creature disappearing yet still dealing damage made no narrative sense, and casual players were consistently surprised when tournament opponents exploited these timing tricks. The goal was making players' first instincts correct more often.

The same update changed **lifelink and deathtouch from triggered abilities to static abilities**. Lifelink now gains life simultaneously with damage being dealt, meaning a creature with lifelink blocking can save its controller from otherwise lethal damage in the same combat. Deathtouch causes destruction via state-based actions, making any damage from a deathtouch source lethal.

**November 2024's Foundations release** completed the cleanup by removing damage assignment order entirely. Previously, when multiple creatures blocked an attacker, the attacking player declared an order immediately after blocks, and damage had to flow in that sequence. Now, attackers distribute damage however they choose during the damage step, after seeing any defensive pump spells. This shifts some power back to attackers and simplifies the rules.

## Edge cases and mistakes that catch experienced players

The most common mistake involves **tapping creatures to prevent attacks**. Once a creature is declared as an attacker, tapping it accomplishes nothing—it remains attacking and deals damage normally. You must tap potential attackers during Beginning of Combat, before the declare attackers step begins. Tournament shortcuts compound this: saying "combat?" and receiving "okay" typically means you've both passed Beginning of Combat entirely.

Veteran players or those taught by veterans often try to **sacrifice creatures after damage is assigned**, expecting the old "damage on the stack" behavior. This hasn't worked since 2009. Sakura-Tribe Elder cannot block, deal damage, and sacrifice for a land. You must choose one or the other.

**"When attacks" versus "put onto the battlefield attacking"** creates another trap. If a creature is put onto the battlefield already attacking (through effects like Kaalia of the Vast), it never performed the action of attacking—"whenever this creature attacks" triggers never fire.

Tournament shortcuts deserve special attention. When you say "combat?" and your opponent responds, they're assumed to be acting in Beginning of Combat. This prevents "gotcha" tricks where you'd bait them into acting in main phase so you could cast a haste creature afterward. If you need to animate a creature-land and attack with it, explicitly announce your activation during main phase rather than using shortcuts.

## Conclusion

The stack's interaction with combat has been refined over Magic's history to match player intuition while preserving strategic depth. The key insight is recognizing which events use the stack (triggered abilities, spells, activated abilities) versus which are turn-based actions (declaring attackers and blockers, dealing damage). Priority windows exist after each turn-based action but never during them. The 2009 removal of damage from the stack and 2024's elimination of damage assignment order both served to simplify combat while making the game's narrative logic more coherent. Master these timing windows, understand when you can and cannot intervene, and you'll avoid the common pitfalls that cost games.