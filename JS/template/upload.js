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

            // Calculate total number of streets played (same for all players)
            let totalStreetsPlayed = 0;
            const allStreets = ['preflop', 'flop', 'turn', 'river'];
            hands.forEach(hand => {
                allStreets.forEach(street => {
                    const acts = hand.scriptedActions[street] || [];
                    if (acts.length > 0) totalStreetsPlayed++;
                });
            });
            // Calculate stats for each hand
            hands.forEach(hand => {
                const players = Object.keys(hand.players);
                players.forEach(name => {
                    if (!playerStats[name]) {
                        playerStats[name] = {
                            vpip: 0, pfr: 0, threeBet: 0, foldToThreeBet: 0, foldToCbet: 0,
                            fold: 0, call: 0, raise: 0, hands: 0, streetsPlayed: 0
                        };
                    }
                    playerStats[name].hands++;
                    playerStats[name].streetsPlayed = totalStreetsPlayed;
                });
                // --- Fold/Call/Raise counts (all streets) ---
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

            // Calculate pot for this hand (sum of all bets, calls, raises, and all posts/blinds)
            let pot = 0;
            const allStreets = ['preflop', 'flop', 'turn', 'river'];
            // Add all 'posts' lines from the header section (before *** HOLE CARDS ***)
            const headerSection = handText.split(/\*\*\* HOLE CARDS \*\*\*/)[0];
            if (headerSection) {
                const postLines = headerSection.split('\n').filter(line => /posts/i.test(line));
                postLines.forEach(line => {
                    // Match posts (e.g. "Player: posts small blind $1", "Player: posts big blind $2", "Player: posts $5")
                    const m = line.match(/: posts (small blind|big blind)? ?\$?([\d,.]+)/i);
                    if (m) {
                        let amt = parseFloat(m[2].replace(/,/g, ''));
                        if (!isNaN(amt)) pot += amt;
                    }
                });
            }
            // Add all bets, calls, raises, all-ins (all streets)
            allStreets.forEach(street => {
                const acts = scriptedActions[street] || [];
                acts.forEach(act => {
                    // Match action and amount (e.g. "Player: calls $2", "Player: raises to $6", "Player: bets $10", "Player: all-in $20")
                    const m = act.match(/: (calls|bets|raises to|all-in)([^\d]*)(\$?([\d,.]+))/i);
                    if (m) {
                        // m[4] is the numeric amount
                        let amt = parseFloat(m[4].replace(/,/g, ''));
                        if (!isNaN(amt)) pot += amt;
                    }
                });
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
                scriptedActions, // { preflop, flop, turn, river, showdown }
                pot
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

    // Render player stats spreadsheet at the bottom
    renderPlayerStatsSpreadsheet();
// Render player stats chart using Chart.js

function renderPlayerStatsSpreadsheet() {
    // Remove old spreadsheet if exists
    let statsDiv = document.getElementById('playerStatsSpreadsheetDiv');
    if (statsDiv) statsDiv.remove();
    statsDiv = document.createElement('div');
    statsDiv.id = 'playerStatsSpreadsheetDiv';
    statsDiv.style = 'margin:40px auto 0 auto; max-width:1100px; background:#222; padding:20px 10px 30px 10px; border-radius:12px;';
    statsDiv.innerHTML = '<h3 style="color:#ffd700;text-align:center;margin-bottom:10px;">Player Stats</h3>';

    const names = Object.keys(playerStats);
    if (!names.length) return;
    const statLabels = [
        { key: 'vpip', label: 'VPIP' },
        { key: 'pfr', label: 'PFR' },
        { key: 'threeBet', label: '3-bet' },
        { key: 'foldToThreeBet', label: 'Fold to 3-bet' },
        { key: 'foldToCbet', label: 'Fold to C-bet' },
        { key: 'fold', label: 'Fold' },
        { key: 'call', label: 'Call' },
        { key: 'raise', label: 'Raise' }
    ];
    // Use the same denominator for all players
    const denominator = playerStats[names[0]].streetsPlayed || 1;

    let table = '<table style="width:100%;border-collapse:collapse;background:#333;color:#fff;">';
    // Header row
    table += '<tr style="background:#444;"><th style="padding:6px 10px;border:1px solid #555;">Stat</th>';
    names.forEach(name => {
        table += `<th style="padding:6px 10px;border:1px solid #555;">${name}</th>`;
    });
    table += '</tr>';
    // Stat rows
    statLabels.forEach(stat => {
        table += `<tr><td style="padding:6px 10px;border:1px solid #555;">${stat.label}</td>`;
        names.forEach(name => {
            const val = playerStats[name][stat.key];
            const pct = denominator > 0 ? (val / denominator * 100).toFixed(1) : '0.0';
            table += `<td style="padding:6px 10px;border:1px solid #555;">${val} <span style='color:#ffd700;'>(${pct}%)</span></td>`;
        });
        table += '</tr>';
    });
    table += '</table>';
    // Add denominator info
    table += `<div style='color:#aaa;font-size:13px;margin-top:8px;'>Percentages use denominator: <b>${denominator}</b> (total number of streets played with actions, same for all players)</div>`;
    statsDiv.innerHTML += table;
    document.body.appendChild(statsDiv);
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

    // Draw table (oval, bigger)
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(500, 250, 400, 170, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Draw pot as label and pile of chips in the center
    const potAmount = hand.pot !== undefined ? hand.pot.toFixed(2) : '?';
    // Draw chips pile
    drawChipsPile(ctx, 500, 250, hand.pot);
    // Draw pot label (smaller, below chips)
    ctx.save();
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    // Draw background rounded rect for pot label
    const labelText = 'Pot: $' + potAmount;
    const labelWidth = ctx.measureText(labelText).width + 24;
    const labelHeight = 28;
    const labelX = 500 - labelWidth/2;
    const labelY = 250 + 38; // just below chips
    ctx.beginPath();
    ctx.moveTo(labelX + 8, labelY);
    ctx.lineTo(labelX + labelWidth - 8, labelY);
    ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + 8);
    ctx.lineTo(labelX + labelWidth, labelY + labelHeight - 8);
    ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - 8, labelY + labelHeight);
    ctx.lineTo(labelX + 8, labelY + labelHeight);
    ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - 8);
    ctx.lineTo(labelX, labelY + 8);
    ctx.quadraticCurveTo(labelX, labelY, labelX + 8, labelY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.fillText(labelText, 500, labelY + 19);
    ctx.restore();

    // Draw board cards (center, slightly lower)
    const cardW = 38, cardH = 54;
    const boardY = 250;
    const boardStartX = 500 - (cardW * 2.5 + 5 * 2);
    boardCards.forEach((card, i) => {
        drawCard(ctx, boardStartX + i * (cardW + 7), boardY, cardW, cardH, card);
    });

    // Draw players (around outside of table, max 9)
    const playerNames = Object.keys(hand.players);
    const n = playerNames.length;
    // Move players to the outside of the board (table)
    const radius = 430; // outside the ellipse x-radius
    const yRadius = 200; // outside the ellipse y-radius
    playerNames.forEach((name, idx) => {
        const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
        const px = 500 + radius * Math.cos(angle);
        const py = 250 + yRadius * Math.sin(angle);
        // Draw player name with gold border and black background
        ctx.save();
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        const text = name;
        const metrics = ctx.measureText(text);
        const padX = 12, padY = 8;
        const boxW = metrics.width + padX * 2;
        const boxH = 32;
        // Black background
        ctx.fillStyle = '#111';
        ctx.fillRect(px - boxW/2, py - boxH/2, boxW, boxH);
        // Gold border
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(px - boxW/2, py - boxH/2, boxW, boxH);
        // Draw player name
        ctx.fillStyle = '#fff';
        ctx.fillText(text, px, py + 6);
        // Draw money with gold border and black background
        ctx.font = '12px Arial';
        const moneyText = '$' + (hand.players[name].money !== null ? hand.players[name].money : '?');
        const moneyMetrics = ctx.measureText(moneyText);
        const moneyBoxW = moneyMetrics.width + padX * 2;
        const moneyBoxH = 22;
        const moneyY = py + 20;
        ctx.fillStyle = '#111';
        ctx.fillRect(px - moneyBoxW/2, moneyY - moneyBoxH/2, moneyBoxW, moneyBoxH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - moneyBoxW/2, moneyY - moneyBoxH/2, moneyBoxW, moneyBoxH);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(moneyText, px, moneyY + 6);
        ctx.restore();
        // Draw player cards (if any)
        const cards = hand.players[name].cards;
        if (Array.isArray(cards)) {
            for (let c = 0; c < cards.length; c++) {
                drawCard(ctx, px - cardW/2 + c * (cardW + 4) - (cards.length-1)*(cardW+4)/2, py + 32, cardW, cardH, cards[c]);
            }
        }
    });
}

// Draw a pile of poker chips at (cx, cy) representing the pot amount
function drawChipsPile(ctx, cx, cy, pot) {
    // Determine number of chips (max 8 for visual, scale by pot)
    let n = 3;
    if (pot > 0) {
        if (pot < 2) n = 3;
        else if (pot < 10) n = 5;
        else if (pot < 50) n = 7;
        else n = 8;
    }
    const chipColors = ['#e74c3c', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#fff', '#e67e22', '#2c3e50'];
    for (let i = 0; i < n; i++) {
        const angle = Math.PI * 2 * i / n;
        const r = 22 + (i % 2) * 6;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * 8;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, 22, 8, 0, 0, 2 * Math.PI);
        ctx.fillStyle = chipColors[i % chipColors.length];
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#222';
        ctx.stroke();
        ctx.restore();
    }
    // Draw a top chip
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 10, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.98;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
    ctx.restore();
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