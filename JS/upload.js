// Helper function to parse card values from text
        function parseCards(text) {
            // This function is now unused, but kept for reference
            return [];
        }

        // Parse BetRivers Poker Hand History
        // function parsePokerHand(text) {
        //     const lines = text.split(/\r?\n/);
        //     const hand = {
        //         handId: '',
        //         game: '',
        //         stakes: '',
        //         date: '',
        //         table: '',
        //         buttonSeat: '',
        //         seats: [],
        //         actions: [],
        //         dealt: [],
        //         board: [],
        //         showdown: [],
        //         summary: {},
        //     };
        //     let section = '';
        //     for (let i = 0; i < lines.length; i++) {
        //         const line = lines[i];
        //         if (line.startsWith('BetRivers Poker Hand')) {
        //             const m = line.match(/Hand #(\d+): ([^\(]+)\(([^)]+)\) - ([^\r\n]+)/);
        //             if (m) {
        //                 hand.handId = m[1];
        //                 hand.game = m[2].trim();
        //                 hand.stakes = m[3].trim();
        //                 hand.date = m[4].trim();
        //             }
        //         } else if (line.startsWith('Table ID')) {
        //             const m = line.match(/Table ID '([^']+)' (.+) Seat #(\d+) is the button/);
        //             if (m) {
        //                 hand.table = m[1];
        //                 hand.buttonSeat = m[3];
        //             }
        //         } else if (line.startsWith('Seat ')) {
        //             const m = line.match(/Seat (\d+): ([^(\[]+)(\[(hero)\])? \(([^)]+) in chips\)/);
        //             if (m) {
        //                 hand.seats.push({
        //                     seat: m[1],
        //                     name: m[2].trim(),
        //                     chips: m[5],
        //                     hero: !!m[4],
        //                 });
        //             }
        //         } else if (line.startsWith('*** ')) {
        //             section = line.replace(/\*/g, '').trim().toUpperCase();
        //         } else if (section === 'HOLE CARDS' && line.startsWith('Dealt to')) {
        //             const m = line.match(/Dealt to ([^\[]+) \[([^\]]+)\]/);
        //             if (m) {
        //                 hand.dealt.push({
        //                     player: m[1].trim(),
        //                     cards: m[2].split(' '),
        //                 });
        //             }
        //         } else if (section === 'FLOP' && line.match(/\[.*\]/)) {
        //             const m = line.match(/\[([^\]]+)\]/);
        //             if (m) hand.board = m[1].split(' ');
        //         } else if (section === 'TURN' && line.match(/\[.*\] \[([^\]]+)\]/)) {
        //             const m = line.match(/\[.*\] \[([^\]]+)\]/);
        //             if (m) hand.board.push(m[1]);
        //         } else if (section === 'RIVER' && line.match(/\[.*\] \[([^\]]+)\]/)) {
        //             const m = line.match(/\[.*\] \[([^\]]+)\]/);
        //             if (m) hand.board.push(m[1]);
        //         } else if (section === 'SHOWDOWN' && line.match(/shows? \[[^\]]+\]/)) {
        //             const m = line.match(/([^:]+) shows? \[([^\]]+)\] for (.+)/);
        //             if (m) {
        //                 hand.showdown.push({
        //                     player: m[1].trim(),
        //                     cards: m[2].split(' '),
        //                     result: m[3],
        //                 });
        //             }
        //         } else if (section === 'SUMMARY' && line.startsWith('Board')) {
        //             const m = line.match(/Board \[([^\]]+)\]/);
        //             if (m) hand.summary.board = m[1].split(' ');
        //         } else if (section === 'SUMMARY' && line.startsWith('Seat ')) {
        //             // Example: Seat 2: StaticShak (small blind) showed [Js 9c] and won $0.19 with Two Pair: Queens and Sevens
        //             const m = line.match(/Seat (\d+): ([^(]+)(\(([^)]+)\) )?(showed \[([^\]]+)\] and won \$([\d.]+) with (.+))?/);
        //             if (m) {
        //                 hand.summary[m[1]] = {
        //                     name: m[2].trim(),
        //                     position: m[4] || '',
        //                     cards: m[6] ? m[6].split(' ') : [],
        //                     won: m[7] ? m[7] : '',
        //                     hand: m[8] ? m[8] : '',
        //                 };
        //             }
        //         } else if (line.match(/posts small blind|posts big blind|calls|folds|checks|bets|raises/)) {
        //             hand.actions.push(line);
        //         }
        //     }
        //     return hand;
        // }

        // document.getElementById('uploadForm').addEventListener('submit', function(e) {
        //     e.preventDefault();
        //     const fileInput = document.getElementById('fileInput');
        //     const file = fileInput.files[0];
        //     if (file && file.type === "text/plain") {
        //         const reader = new FileReader();
        //         reader.onload = function(event) {
        //             const text = event.target.result;
        //             const hand = parsePokerHand(text);
        //             let output = '';
        //             output += `<b>Hand #${hand.handId}</b> - ${hand.game} (${hand.stakes})<br>Date: ${hand.date}<br>`;
        //             output += `<b>Table:</b> ${hand.table} (Button: Seat ${hand.buttonSeat})<br>`;
        //             output += `<b>Players:</b><ul>` + hand.seats.map(s => `<li>${s.seat}: ${s.name} (${s.chips}${s.hero ? ' [hero]' : ''})</li>`).join('') + '</ul>';
        //             output += `<b>Dealt Cards:</b><ul>` + hand.dealt.map(d => `<li>${d.player}: ${d.cards.join(' ')}</li>`).join('') + '</ul>';
        //             output += `<b>Board:</b> ${hand.board.join(' ')}<br>`;
        //             output += `<b>Actions:</b><ul>` + hand.actions.map(a => `<li>${a}</li>`).join('') + '</ul>';
        //             if (hand.showdown.length > 0) {
        //                 output += `<b>Showdown:</b><ul>` + hand.showdown.map(sd => `<li>${sd.player}: ${sd.cards.join(' ')} (${sd.result})</li>`).join('') + '</ul>';
        //             }
        //             if (hand.summary && hand.summary.board) {
        //                 output += `<b>Summary Board:</b> ${hand.summary.board.join(' ')}<br>`;
        //             }
        //             output += `<b>Summary:</b><ul>`;
        //             for (const seat in hand.summary) {
        //                 if (!isNaN(seat)) {
        //                     const s = hand.summary[seat];
        //                     output += `<li>Seat ${seat}: ${s.name} ${s.position ? '(' + s.position + ')' : ''}`;
        //                     if (s.cards && s.cards.length > 0) {
        //                         output += ` showed [${s.cards.join(' ')}]`;
        //                     }
        //                     if (s.won) {
        //                         output += ` and won $${s.won}`;
        //                     }
        //                     if (s.hand) {
        //                         output += ` with ${s.hand}`;
        //                     }
        //                     output += `</li>`;
        //                 }
        //             }
        //             output += '</ul>';
        //             document.getElementById('fileContent').innerHTML = output;
        //         };
        //         reader.readAsText(file);
        //     } else {
        //         document.getElementById('fileContent').textContent = 'Please select a valid .txt file.';
        //     }
        // });

        document.getElementById('fileInput').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                const text = event.target.result;
                const hands = parsePokerHands(text);
                displayHands(hands);
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

            // Extract board cards
            const boardMatch = handText.match(/Board \[([^\]]+)\]/);
            const board = boardMatch ? boardMatch[1].split(' ') : [];

            // Extract actions by street
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
                summary: summaryLines
            };
        }

        function displayHands(hands) {
            const output = document.getElementById('output');
            output.innerHTML = '';
            hands.forEach((hand, idx) => {
                const div = document.createElement('div');
                div.className = 'hand-block';
                div.innerHTML = `
            <h3>Hand #${hand.handId} (${hand.gameType})</h3>
            <div><b>Date:</b> ${hand.date}</div>
            <div><b>Seats:</b><br>${hand.seats.map(s => '&nbsp;&nbsp;' + s).join('<br>')}</div>
            <div><b>Dealt:</b><br>${hand.dealt.map(d => `${d.player}: [${d.cards}]`).join('<br>')}</div>
            <div><b>Board:</b> ${hand.board.join(' ')}</div>
            <div><b>Actions:</b><br>
                ${Object.entries(hand.streets).map(([street, acts]) =>
                    `<b>${street}:</b><br>${acts.map(a => '&nbsp;&nbsp;' + a).join('<br>')}`
                ).join('<br>')}
            </div>
            <div><b>Summary:</b><br>${hand.summary.join('<br>')}</div>
            <hr>
        `;
                output.appendChild(div);
            });
        }

        //