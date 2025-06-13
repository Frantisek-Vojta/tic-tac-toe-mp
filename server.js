// Načtení potřebných modulů
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Vytvoření Express aplikace a HTTP serveru
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Inicializace Socket.IO serveru

// 1️⃣ Servování statických souborů z adresáře "public"
app.use(express.static(path.join(__dirname, 'public')));

// 2️⃣ Herní logika
let players = []; // Seznam připojených hráčů
let board = Array(9).fill(null); // Herní pole 3x3, kde každý prvek může být 'X', 'O' nebo null
let currentPlayer = 'X'; // Hráč, který je právě na tahu (začíná 'X')

// Obsluha připojení nového klienta přes Socket.IO
io.on('connection', socket => {
    console.log('User connected', socket.id);

    // Přidání hráče, pokud nejsou obsazena obě místa (max 2 hráči)
    if (players.length < 2) {
        // První hráč dostane symbol 'X', druhý 'O'
        const symbol = players.length === 0 ? 'X' : 'O';
        players.push({ id: socket.id, symbol });

        // Informujeme připojeného hráče o jeho symbolu
        socket.emit('player', symbol);

        // Jakmile jsou připojeni dva hráči, spustíme hru pro všechny
        if (players.length === 2) io.emit('startGame');
    } else {
        // Pokud jsou už 2 hráči, oznámíme novému připojení, že je místnost plná
        socket.emit('full');
    }

    // Zpracování tahu hráče
    socket.on('move', ({ index, symbol }) => {
        // Kontrola, zda je tah platný: správný hráč na tahu a pozice volná
        if (symbol === currentPlayer && board[index] === null) {
            board[index] = symbol; // Uložení tahu do pole
            // Přepnutí tahu na druhého hráče
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            // Poslání aktualizovaného stavu hry všem hráčům
            io.emit('update', { board, currentPlayer });
        }
    });

    // Zpracování požadavku na reset hry
    socket.on('reset', () => {
        board = Array(9).fill(null); // Vyčištění herního pole
        currentPlayer = 'X'; // Reset tahu na hráče 'X'
        // Oznámení všem hráčům o resetu hry
        io.emit('update', { board, currentPlayer });
    });

    // Zpracování odpojení hráče
    socket.on('disconnect', () => {
        // Odebrání odpojeného hráče ze seznamu
        players = players.filter(p => p.id !== socket.id);

        // Reset hry při odpojení hráče
        board = Array(9).fill(null);
        currentPlayer = 'X';

        // Informování zbylých hráčů o resetu hry
        io.emit('resetGame');
        console.log('User disconnected', socket.id);
    });
});

// Spuštění serveru na daném portu (výchozí 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server běží na http://localhost:${PORT}`));
