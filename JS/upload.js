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

// Player stats: { playerName: { vpip, pfr, threeBet, foldToThreeBet, foldToCbet, fold, call, raise, hands } }
let playerStats = {};

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
            // Reset stats
            playerStats = {};
            // Split hands by the separator line (--- or similar)
            const handBlocks = text.split(/^-{5,}$/m).map(h => h.trim()).filter(Boolean);
            const hands = handBlocks.map(parseSingleHand);

            // Calculate stats for each hand
            hands.forEach(hand => {
                // VPIP/PFR/3-bet/Fold to 3-bet/Fold to C-bet
                const players = Object.keys(hand.players);
                players.forEach(name => {
                    if (!playerStats[name]) {
                        playerStats[name] = {
                            vpip: 0, pfr: 0, threeBet: 0, foldToThreeBet: 0, foldToCbet: 0,
                            fold: 0, call: 0, raise: 0, hands: 0
                        };
                    }
                    playerStats[name].hands++;
                });
        // --- Fold/Call/Raise counts (all streets) ---
        const allStreets = ['preflop', 'flop', 'turn', 'river'];
        allStreets.forEach(street => {
            const acts = hand.scriptedActions[street] || [];
            acts.forEach(act => {
                const m = act.match(/^([^:]+):\s*(.+)$/);
                if (!m) return;
                const player = m[1].trim();
                const action = m[2].toLowerCase();
                if (action.includes('fold')) playerStats[player].fold++;
                if (action.includes('call')) playerStats[player].call++;
                if (action.includes('raise') || action.includes('bet') || action.includes('all-in')) playerStats[player].raise++;
            });
        });

                // --- VPIP & PFR ---
                // Preflop actions
                const preflopActs = hand.scriptedActions.preflop || [];
                const vpipPlayers = new Set();
                const pfrPlayers = new Set();
                const threeBetPlayers = new Set();
                let lastRaiser = null;
                preflopActs.forEach(act => {
                    // Example: "Player1: calls $2", "Player2: raises to $6", "Player3: folds"
                    const m = act.match(/^([^:]+):\s*(.+)$/);
                    if (!m) return;
                    const player = m[1].trim();
                    const action = m[2].toLowerCase();
                    if (action.includes('calls') || action.includes('raises') || action.includes('bets') || action.includes('all-in')) {
                        vpipPlayers.add(player);
                    }
                    if (action.includes('raises') || action.includes('bets') || action.includes('all-in')) {
                        if (lastRaiser !== null) {
                            // This is a 3-bet if there was already a raiser
                            threeBetPlayers.add(player);
                        }
                        if (lastRaiser === null) {
                            pfrPlayers.add(player);
                        }
                        lastRaiser = player;
                    }
                });
                vpipPlayers.forEach(p => playerStats[p].vpip++);
                pfrPlayers.forEach(p => playerStats[p].pfr++);
                threeBetPlayers.forEach(p => playerStats[p].threeBet++);

                // --- Fold to 3-bet ---
                // If a player raises, then another 3-bets, and the original raiser folds
                if (threeBetPlayers.size > 0) {
                    preflopActs.forEach((act, idx) => {
                        const m = act.match(/^([^:]+):\s*(.+)$/);
                        if (!m) return;
                        const player = m[1].trim();
                        const action = m[2].toLowerCase();
                        if (action.includes('folds')) {
                            // Look back for a 3-bet before this fold
                            for (let j = idx - 1; j >= 0; j--) {
                                const prev = preflopActs[j];
                                if (!prev) continue;
                                const pm = prev.match(/^([^:]+):\s*(.+)$/);
                                if (!pm) continue;
                                const prevPlayer = pm[1].trim();
                                const prevAction = pm[2].toLowerCase();
                                if (threeBetPlayers.has(prevPlayer) && prevPlayer !== player) {
                                    playerStats[player].foldToThreeBet++;
                                    break;
                                }
                            }
                        }
                    });
                }

                // --- Fold to C-bet ---
                // If a player folds to a bet/raise on the flop
                const flopActs = hand.scriptedActions.flop || [];
                const flopBettors = new Set();
                flopActs.forEach(act => {
                    const m = act.match(/^([^:]+):\s*(.+)$/);
                    if (!m) return;
                    const player = m[1].trim();
                    const action = m[2].toLowerCase();
                    if (action.includes('bets') || action.includes('raises') || action.includes('all-in')) {
                        flopBettors.add(player);
                    }
                });
                flopActs.forEach((act, idx) => {
                    const m = act.match(/^([^:]+):\s*(.+)$/);
                    if (!m) return;
                    const player = m[1].trim();
                    const action = m[2].toLowerCase();
                    if (action.includes('folds')) {
                        // Look back for a bet/raise before this fold
                        for (let j = idx - 1; j >= 0; j--) {
                            const prev = flopActs[j];
                            if (!prev) continue;
                            const pm = prev.match(/^([^:]+):\s*(.+)$/);
                            if (!pm) continue;
                            const prevPlayer = pm[1].trim();
                            const prevAction = pm[2].toLowerCase();
                            if (flopBettors.has(prevPlayer) && prevPlayer !== player) {
                                playerStats[player].foldToCbet++;
                                break;
                            }
                        }
                    }
                });
            });
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

            // Helper to parse cards string into array of {rank, suit}
            function parseCardObjects(cardStr) {
                if (!cardStr) return null;
                return cardStr.split(' ').map(card => {
                    if (card.length === 2) {
                        return { rank: card[0], suit: card[1] };
                    } else if (card.length === 3) {
                        return { rank: card.slice(0, card.length-1), suit: card[card.length-1] };
                    } else {
                        return null;
                    }
                }).filter(Boolean);
            }

            // Extract board cards as objects
            const boardMatch = handText.match(/Board \[([^\]]+)\]/);
            const board = boardMatch ? parseCardObjects(boardMatch[1]) : [];

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
                board, // array of {rank, suit}
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

    // Board state for this street
    let boardCards = [];
    if (street === 'flop') {
        boardCards = hand.board.slice(0, 3);
    } else if (street === 'turn') {
        boardCards = hand.board.slice(0, 4);
    } else if (street === 'river' || street === 'showdown') {
        boardCards = hand.board.slice(0, 5);
    }
    // Format board as string
    const boardHtml = boardCards.length ? boardCards.map(c => `${c.rank}${c.suit}`).join(' ') : '<i>No board cards</i>';

    const div = document.createElement('div');
    div.className = 'hand-block';
    div.innerHTML = `
        <h3>Hand #${hand.handId} (${hand.gameType})</h3>
        <div><b>Date:</b> ${hand.date}</div>
        <div><b>Players:</b><br>${playerHtml}</div>
        <div style="margin:10px 0 5px 0;">
            <button id="prevStreetBtn" type="button" style="font-size:12px;padding:2px 8px;min-width:0;" ${currentStreetIndex === 0 ? 'disabled' : ''}>Previous Street</button>
            <b style="margin:0 10px;">${streetLabel}</b>
            <button id="nextStreetBtn" type="button" style="font-size:12px;padding:2px 8px;min-width:0;" ${currentStreetIndex === streetOrder.length-1 ? 'disabled' : ''}>Next Street</button>
        </div>
        <div><b>Board:</b> ${boardHtml}</div>
        <div><b>Actions:</b><br>${actionsHtml}</div>
        <div style="display:flex;justify-content:center;">
            <canvas id="pokerCanvas" width="1000" height="500" style="margin:20px 0; border:1px solid #ccc; background:#0b4c0b;"></canvas>
        </div>
        <div style="margin-top:10px; text-align:right; color:#888; font-size:13px;">Hand ${currentHandIndex+1} of ${pokerHands.length}</div>
        <button id="nextHandBtn" type="button" style="font-size:12px;padding:2px 8px;min-width:0;margin-top:15px;" ${currentHandIndex >= pokerHands.length-1 ? 'disabled' : ''}>Next Hand</button>
        <button id="prevHandBtn" type="button" style="font-size:12px;padding:2px 8px;min-width:0;margin-top:15px; margin-left:10px;" ${currentHandIndex === 0 ? 'disabled' : ''}>Previous Hand</button>
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

    // Render poker table/cards on canvas
    renderPokerCanvas(hand, boardCards);

    // Render player stats chart at the bottom
    renderPlayerStatsChart();
// Render player stats chart using Chart.js
function renderPlayerStatsChart() {
    // Remove old chart if exists
    let chartDiv = document.getElementById('playerStatsChartDiv');
    if (chartDiv) chartDiv.remove();
    chartDiv = document.createElement('div');
    chartDiv.id = 'playerStatsChartDiv';
    chartDiv.style = 'margin:40px auto 0 auto; max-width:1100px; background:#222; padding:20px 10px 30px 10px; border-radius:12px;';
    chartDiv.innerHTML = '<h3 style="color:#ffd700;text-align:center;margin-bottom:10px;">Player Stats</h3>' +
        '<canvas id="playerStatsChart" width="1000" height="320"></canvas>';
    document.body.appendChild(chartDiv);

    // Prepare data
    const names = Object.keys(playerStats);
    if (!names.length) return;
    const stats = names.map(n => playerStats[n]);
    // VPIP, PFR, 3-bet, Fold to 3-bet, Fold to C-bet, Fold, Call, Raise
    const labels = ['VPIP', 'PFR', '3-bet', 'Fold to 3-bet', 'Fold to C-bet', 'Fold', 'Call', 'Raise'];
    const datasets = labels.map((label, i) => ({
        label,
        data: names.map(n => {
            const s = playerStats[n];
            switch (label) {
                case 'VPIP': return s.vpip;
                case 'PFR': return s.pfr;
                case '3-bet': return s.threeBet;
                case 'Fold to 3-bet': return s.foldToThreeBet;
                case 'Fold to C-bet': return s.foldToCbet;
                case 'Fold': return s.fold;
                case 'Call': return s.call;
                case 'Raise': return s.raise;
                default: return 0;
            }
        }),
        backgroundColor: getStatColor(label),
    }));

    // Load Chart.js if not present
    if (typeof window.Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => drawChart();
        document.head.appendChild(script);
    } else {
        drawChart();
    }

    function drawChart() {
        const ctx = document.getElementById('playerStatsChart').getContext('2d');
        new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: names,
                datasets: datasets
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#ffd700', font: { size: 13 } } },
                    title: { display: false }
                },
                scales: {
                    x: { ticks: { color: '#fff', font: { size: 13 } } },
                    y: { beginAtZero: true, ticks: { color: '#fff', font: { size: 13 } } }
                }
            }
        });
    }
}

function getStatColor(label) {
    switch (label) {
        case 'VPIP': return 'rgba(0, 123, 255, 0.7)';
        case 'PFR': return 'rgba(40, 167, 69, 0.7)';
        case '3-bet': return 'rgba(255, 193, 7, 0.7)';
        case 'Fold to 3-bet': return 'rgba(220, 53, 69, 0.7)';
        case 'Fold to C-bet': return 'rgba(108, 117, 125, 0.7)';
        case 'Fold': return 'rgba(255, 99, 132, 0.7)';
        case 'Call': return 'rgba(23, 162, 184, 0.7)';
        case 'Raise': return 'rgba(255, 206, 86, 0.7)';
        default: return 'rgba(200,200,200,0.7)';
    }
}
 
// Draw cards, board, and players on canvas
function renderPokerCanvas(hand, boardCards) {
    const canvas = document.getElementById('pokerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw table (oval)
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(500, 250, 320, 120, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Draw board cards (center)
    const cardW = 32, cardH = 46;
    const boardY = 215;
    const boardStartX = 500 - (cardW * 2.5 + 5 * 2);
    boardCards.forEach((card, i) => {
        drawCard(ctx, boardStartX + i * (cardW + 5), boardY, cardW, cardH, card);
    });

    // Draw players (around table, max 9)
    const playerNames = Object.keys(hand.players);
    const n = playerNames.length;
    // Move players to the edge of the board (table)
    const radius = 320; // match ellipse x-radius for edge
    playerNames.forEach((name, idx) => {
        const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
        const px = 500 + radius * Math.cos(angle);
        const py = 250 + 120 * Math.sin(angle); // match ellipse y-radius for edge
        // Draw player name
        ctx.save();
        ctx.font = 'bold 15px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(name, px, py);
        // Draw money
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('$' + (hand.players[name].money !== null ? hand.players[name].money : '?'), px, py + 16);
        ctx.restore();
        // Draw player cards (if any)
        const cards = hand.players[name].cards;
        if (Array.isArray(cards)) {
            for (let c = 0; c < cards.length; c++) {
                drawCard(ctx, px - cardW/2 + c * (cardW + 4) - (cards.length-1)*(cardW+4)/2, py + 22, cardW, cardH, cards[c]);
            }
        }
    });
}

// Draw a single card (simple rectangle with rank/suit)
function drawCard(ctx, x, y, w, h, card) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    // Draw rank and suit (smaller)
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = (card.suit === 'h' || card.suit === 'd') ? '#c00' : '#000';
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 5, y + 16);
    ctx.textAlign = 'right';
    ctx.fillText(renderSuit(card.suit), x + w - 5, y + 16);
    ctx.restore();
}

// Render suit as symbol
function renderSuit(suit) {
    switch (suit) {
        case 'h': return '♥';
        case 'd': return '♦';
        case 'c': return '♣';
        case 's': return '♠';
        default: return suit;
        //
    }
}
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