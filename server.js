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
let board = Array(9).fill(null); // Herní pole (3x3 pro piškvorky)
let currentPlayer = 'X'; // Hráč, který je právě na tahu

// Obsluha připojení nového klienta
io.on('connection', socket => {
    console.log('User connected', socket.id);

    // Přidání hráče, pokud jsou volná místa (max 2 hráči)
    if (players.length < 2) {
        const symbol = players.length === 0 ? 'X' : 'O'; // První hráč = X, druhý = O
        players.push({ id: socket.id, symbol });
        socket.emit('player', symbol); // Odeslání symbolu hráči

        // Spuštění hry, když jsou připojeni oba hráči
        if (players.length === 2) io.emit('startGame');
    } else {
        // Pokud je místnost plná, informujeme hráče
        socket.emit('full');
    }

    // Obsluha tahu hráče
    socket.on('move', ({ index, symbol }) => {
        // Kontrola, zda je tah platný
        if (symbol === currentPlayer && board[index] === null) {
            board[index] = symbol; // Zápis tahu do herního pole
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X'; // Přepnutí hráče
            io.emit('update', { board, currentPlayer }); // Odeslání aktualizace všem hráčům
        }
    });

    // Obsluha resetu hry
    socket.on('reset', () => {
        board = Array(9).fill(null); // Vyčištění pole
        currentPlayer = 'X'; // Obnovení výchozího hráče
        io.emit('update', { board, currentPlayer }); // Odeslání nové hry
    });

    // Odpojení hráče
    socket.on('disconnect', () => {
        // Odebrání hráče ze seznamu
        players = players.filter(p => p.id !== socket.id);

        // Resetování hry
        board = Array(9).fill(null);
        currentPlayer = 'X';

        // Oznámení ostatním, že hra se resetuje
        io.emit('resetGame');
        console.log('User disconnected', socket.id);
    });
});

// Spuštění serveru
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server běží na http://localhost:${PORT}`));
