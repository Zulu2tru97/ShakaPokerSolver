// Helper function to parse card values from text
        function parseCards(text) {
            // This function is now unused, but kept for reference
            return [];
        }

        

// Global state for hands and index
let pokerHands = [];
let currentHandIndex = 0;
let currentStreetIndex = 0;
const streetOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];

document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        pokerHands = parsePokerHands(text);
        currentHandIndex = 0;
        displayHands();
    };
    reader.readAsText(file);
});

        function parsePokerHands(text) {
            // Split hands by the separator line (--- or similar)
            const handBlocks = text.split(/^-{5,}$/m).map(h => h.trim()).filter(Boolean);
            const hands = handBlocks.map(parseSingleHand);
            return hands;
        }

        function parseSingleHand(handText) {
            // Extract hand header
            const headerMatch = handText.match(/^BetRivers Poker Hand #(\d+): (.+) - ([^\n]+)/m);
            const handId = headerMatch ? headerMatch[1] : '';
            const gameType = headerMatch ? headerMatch[2] : '';
            const date = headerMatch ? headerMatch[3] : '';

            // Extract hero
            const heroMatch = handText.match(/\[hero\]/);
            // Extract seats
            const seatLines = handText.match(/^Seat \d+:.*$/gm) || [];
            const seats = seatLines.map(line => line.replace(/^Seat \d+:\s*/, ''));

            // Extract dealt cards for all players
            const dealt = [];
            const dealtRegex = /^Dealt to ([^\[]+) \[([^\]]+)\]/gm;
            let dealtMatch;
            while ((dealtMatch = dealtRegex.exec(handText)) !== null) {
                dealt.push({ player: dealtMatch[1].trim(), cards: dealtMatch[2].trim() });
            }

            // Extract player money from seat lines (e.g., "Seat 1: JohnDoe ($100 in chips)")
            const playerMoney = {};
            seatLines.forEach(line => {
                const seatMatch = line.match(/^Seat \d+: ([^(]+) \(([^)]+) in chips\)/);
                if (seatMatch) {
                    const player = seatMatch[1].trim();
                    // Remove $ and commas, parse as float
                    const moneyStr = seatMatch[2].replace(/[$,]/g, '');
                    const money = parseFloat(moneyStr);
                    playerMoney[player] = isNaN(money) ? null : money;
                }
            });

            // Helper to parse cards string into array of {rank, suit}
            function parseCardObjects(cardStr) {
                if (!cardStr) return null;
                // Split by space, e.g. "Ah Kd" => ["Ah", "Kd"]
                return cardStr.split(' ').map(card => {
                    // If card is 2 chars (e.g. Ah), rank=first, suit=second
                    // If card is 3 chars (e.g. 10h), rank=first 1-2 chars, suit=last
                    if (card.length === 2) {
                        return { rank: card[0], suit: card[1] };
                    } else if (card.length === 3) {
                        return { rank: card.slice(0, card.length-1), suit: card[card.length-1] };
                    } else {
                        return null;
                    }
                }).filter(Boolean);
            }

            // Build players object: { playerName: { cards, money } }
            const players = {};
            // Add money for all players from seat lines
            Object.keys(playerMoney).forEach(player => {
                players[player] = { cards: null, money: playerMoney[player] };
            });
            // Add cards for players who were dealt in, as array of {rank, suit}
            dealt.forEach(d => {
                if (!players[d.player]) players[d.player] = { cards: parseCardObjects(d.cards), money: null };
                else players[d.player].cards = parseCardObjects(d.cards);
            });

            // Extract board cards
            const boardMatch = handText.match(/Board \[([^\]]+)\]/);
            const board = boardMatch ? boardMatch[1].split(' ') : [];

            // Extract actions by street and break them down for scripting
            const streets = {};
            const streetNames = ['HOLE CARDS', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN', 'SUMMARY'];
            let currentStreet = null;
            handText.split('\n').forEach(line => {
                const streetHeader = line.match(/^\*\*\* (.+) \*\*\*/);
                if (streetHeader && streetNames.includes(streetHeader[1].replace(/ \*+$/, ''))) {
                    currentStreet = streetHeader[1].replace(/ \*+$/, '');
                    streets[currentStreet] = [];
                } else if (currentStreet && line.trim() && !line.startsWith('Dealt to') && !line.startsWith('Board')) {
                    streets[currentStreet].push(line.trim());
                }
            });

            // Scripted actions for Texas Hold'em: breakdown by street
            // Map hand history street names to poker script stages
            const streetMap = {
                'HOLE CARDS': 'preflop',
                'FLOP': 'flop',
                'TURN': 'turn',
                'RIVER': 'river',
                'SHOWDOWN': 'showdown',
            };
            const scriptedActions = {
                preflop: [],
                flop: [],
                turn: [],
                river: [],
                showdown: []
            };
            Object.entries(streets).forEach(([street, actions]) => {
                const key = streetMap[street];
                if (key) {
                    scriptedActions[key] = actions.slice();
                }
            });

            // Extract summary
            const summaryLines = [];
            let inSummary = false;
            handText.split('\n').forEach(line => {
                if (line.startsWith('*** SUMMARY ***')) inSummary = true;
                else if (inSummary) summaryLines.push(line.trim());
            });

            return {
                handId,
                gameType,
                date,
                seats,
                dealt,
                board,
                streets,
                summary: summaryLines,
                players, // new object: { playerName: { cards, money } }
                scriptedActions // { preflop, flop, turn, river, showdown }
            };
        }


// Display one hand at a time and include Next Hand button
function displayHands() {
    const output = document.getElementById('output');
    output.innerHTML = '';
    if (!pokerHands.length) {
        output.textContent = 'No hands found.';
        return;
    }
    const hand = pokerHands[currentHandIndex];
    // Display player info with cards as objects
    const playerHtml = Object.entries(hand.players).map(([name, info]) => {
        const cards = Array.isArray(info.cards) ? info.cards.map(c => `${c.rank}${c.suit}`).join(' ') : '';
        return `${name}: <b>${cards}</b> ($${info.money !== null ? info.money : '?'})`;
    }).join('<br>');

    // Street navigation
    const street = streetOrder[currentStreetIndex];
    const streetLabel = street.charAt(0).toUpperCase() + street.slice(1);
    const actions = hand.scriptedActions[street] || [];
    const actionsHtml = actions.length ? actions.map(a => `&nbsp;&nbsp;${a}`).join('<br>') : '<i>No actions</i>';

    const div = document.createElement('div');
    div.className = 'hand-block';
    div.innerHTML = `
        <h3>Hand #${hand.handId} (${hand.gameType})</h3>
        <div><b>Date:</b> ${hand.date}</div>
        <div><b>Players:</b><br>${playerHtml}</div>
        <div><b>Board:</b> ${hand.board.join(' ')}</div>
        <div style="margin:10px 0 5px 0;">
            <button id="prevStreetBtn" type="button" ${currentStreetIndex === 0 ? 'disabled' : ''}>Previous Street</button>
            <b style="margin:0 10px;">${streetLabel}</b>
            <button id="nextStreetBtn" type="button" ${currentStreetIndex === streetOrder.length-1 ? 'disabled' : ''}>Next Street</button>
        </div>
        <div><b>Actions:</b><br>${actionsHtml}</div>
        <div style="margin-top:10px; text-align:right; color:#888; font-size:13px;">Hand ${currentHandIndex+1} of ${pokerHands.length}</div>
        <button id="nextHandBtn" type="button" style="margin-top:15px;" ${currentHandIndex >= pokerHands.length-1 ? 'disabled' : ''}>Next Hand</button>
        <button id="prevHandBtn" type="button" style="margin-top:15px; margin-left:10px;" ${currentHandIndex === 0 ? 'disabled' : ''}>Previous Hand</button>
    `;
    output.appendChild(div);

    // Attach event listeners for navigation
    const nextBtn = document.getElementById('nextHandBtn');
    if (nextBtn) nextBtn.addEventListener('click', goToNextHand);
    const prevBtn = document.getElementById('prevHandBtn');
    if (prevBtn) prevBtn.addEventListener('click', goToPrevHand);
    const nextStreetBtn = document.getElementById('nextStreetBtn');
    if (nextStreetBtn) nextStreetBtn.addEventListener('click', goToNextStreet);
    const prevStreetBtn = document.getElementById('prevStreetBtn');
    if (prevStreetBtn) prevStreetBtn.addEventListener('click', goToPrevStreet);
}

function goToNextHand() {
    if (currentHandIndex < pokerHands.length - 1) {
        currentHandIndex++;
        currentStreetIndex = 0;
        displayHands();
    }
}

function goToPrevHand() {
    if (currentHandIndex > 0) {
        currentHandIndex--;
        currentStreetIndex = 0;
        displayHands();
    }
}

function goToNextStreet() {
    if (currentStreetIndex < streetOrder.length - 1) {
        currentStreetIndex++;
        displayHands();
    }
}

function goToPrevStreet() {
    if (currentStreetIndex > 0) {
        currentStreetIndex--;
        displayHands();
    }
}

        //