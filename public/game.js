// Po načtení celé stránky
document.addEventListener('DOMContentLoaded', () => {
    const status = document.querySelector('.status'); // Element pro zobrazení stavu hry
    const resetBtn = document.querySelector('.reset'); // Tlačítko pro reset hry
    const boxes = document.querySelectorAll('.box'); // Všechny políčka herního pole
    const socket = io(); // Připojení k Socket.IO serveru

    // Lokální stav hry
    let mySymbol = null, board = [], currentPlayer = 'X', gameActive = false;

    // Aktualizace zobrazení herního pole a stavu
    function renderBoard() {
        boxes.forEach((box, i) => {
            box.className = 'box'; // Reset třídy
            if (board[i] === 'X') box.classList.add('cross'); // Přidání třídy pro křížek
            if (board[i] === 'O') box.classList.add('circle'); // Přidání třídy pro kolečko
        });

        // Zobrazení aktuálního stavu
        status.textContent = gameActive
            ? `Na tahu: ${currentPlayer}`
            : (mySymbol ? 'Čekání na druhého hráče...' : 'Hra plná/čekej...');
    }

    // Kliknutí na políčko hráčem
    boxes.forEach((box, i) => {
        box.addEventListener('click', () => {
            if (!gameActive) return; // Hra neběží
            if (board[i] || mySymbol !== currentPlayer) return; // Pole obsazeno nebo není tah hráče
            socket.emit('move', { index: i, symbol: mySymbol }); // Odeslání tahu na server
        });
    });

    // Kliknutí na tlačítko pro reset
    resetBtn.addEventListener('click', () => {
        if (mySymbol) socket.emit('reset'); // Pošleme požadavek na reset hry
    });

    // Server přiřadí hráči symbol (X nebo O)
    socket.on('player', symbol => {
        mySymbol = symbol;
        status.textContent = `Jsi hráč: ${symbol}`; // Zobrazení, jaký hráč jsem
    });

    // Server zahájí hru, když jsou připojeni dva hráči
    socket.on('startGame', () => {
        board = Array(9).fill(null); // Vymazání herního pole
        gameActive = true; // Nastavení hry jako aktivní
        currentPlayer = 'X'; // Začíná hráč X
        renderBoard(); // Vykreslení
    });

    // Server posílá aktualizace hry (stav pole a hráče na tahu)
    socket.on('update', data => {
        ({ board, currentPlayer } = data); // Destrukturalizace dat
        renderBoard(); // Aktualizace zobrazení

        // Kontrola výherce nebo remízy
        const winner = checkWinner();
        if (winner || board.every(c => c)) gameActive = false;
        if (winner) status.textContent = `Vyhrál: ${winner}`;
        else if (!gameActive) status.textContent = 'Remíza!';
    });

    // Server oznamuje, že došlo k resetu hry (např. po odpojení hráče)
    socket.on('resetGame', () => {
        board = Array(9).fill(null); // Vymazání pole
        gameActive = false; // Hra není aktivní
        renderBoard(); // Aktualizace zobrazení
    });

    // Server informuje, že hra je plnaa
    socket.on('full', () => alert('Hra je plná – zkus později.'));

    // Funkce pro kontrolu vítěze
    function checkWinner() {
        const combos = [
            [0,1,2],[3,4,5],[6,7,8],     // řádky
            [0,3,6],[1,4,7],[2,5,8],     // sloupce
            [0,4,8],[2,4,6]              // diagonály
        ];
        for (const [a,b,c] of combos)
            if (board[a] && board[a] === board[b] && board[a] === board[c])
                return board[a]; // Vrátí vítězný symbol
        return null; // Nikdo nevyhrál
    }
});
