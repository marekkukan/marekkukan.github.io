const DICE_DICT = {1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'};
const CLOCK_DELAY = 15;

var colors = [
    '#0000FF', //blue
    '#FF0000', //red
    '#FFEE00', //yellow
    '#008000', //green
    '#FFA500', // orange
    '#800080', //purple
    '#808000', //olive
    '#00FF00', //lime
    '#800000', //maroon
    '#00FFFF', //aqua
    '#008080', //team
    '#000080', //navy
    '#FF00FF', //fushua
    '#808080', //gray
    '#abcdef',
    '#cdabef',
    '#cdefab',
    '#efabcd',
    '#efcdab'
];
var app = document.getElementById("myApp");
var app2 = document.getElementById("myApp2");
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
ctx.save();

function displayApp() {
  app.style.display = "block";
  app2.style.display = "none";
  canvas.style.display = "none";
}

function displayApp2() {
  app.style.display = "none";
  app2.style.display = "block";
  canvas.style.display = "none";
}

function displayGraph(season, prefix = "") {
  app.style.display = "none";
  app2.style.display = "none";
  canvas.style.display = "initial";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.9;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var spreadsheetId;
  if (season == "2020") spreadsheetId = "1SMSHgI_VwedJJFKElNIdlErG83lAum5I2SvgElYS6eU";
  if (season == "2021") spreadsheetId = "1ffUJY2jo2mX_1tJ1OmZ_Dxp41sEBthG6KEEjwTsXS0M";
  if (season == "2022") spreadsheetId = "1mVjQi_iY3BpdJO58tXPjmBONose6rMCHtmw3NLvGysY";
  var url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${prefix}body!B1:Z100&ranges=${prefix}kumulativne%20body!B2:Z100&majorDimension=COLUMNS&key=AIzaSyCLvFHhl5l1iNKv2PaJM7n8eSftTCX8OTE`;
  $.get(
    url,
    function(data) {
        ctx.restore();
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 2vmin sans-serif';
        c = 0;
        labels = [];
        lowestScore = Math.min(...data.valueRanges[1].values.map(x => Math.min(...x.map(parseFloat))));
        highestScore = Math.max(...data.valueRanges[1].values.map(x => Math.max(...x.map(parseFloat))));
        numberOfGames = data.valueRanges[1].values[0].length - 1;
        var dx = 0.8 * canvas.width / numberOfGames;
        var sx = 0.02 * canvas.width;
        var sy = 0.9 * canvas.height * highestScore / (highestScore - lowestScore) + 0.05 * canvas.height;
        var my = 0.9 * canvas.height / (highestScore - lowestScore);
        for ([idx, column] of data.valueRanges[0].values.entries()) {
            c %= colors.length;
            ctx.strokeStyle = colors[c++];
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 4;
            var x = sx;
            var y = sy;
            var started = false;
            for (i of column.slice(2)) {
                if (!started && i == "") {
                  x += dx;
                  continue;
                }
                if (!started) {
                  ctx.beginPath();
                  ctx.arc(x, y, 6, 0, 2 * Math.PI);
                  ctx.fill();
                  started = true;
                }
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.setLineDash([]);
                if (i == "") {
                    i = "0";
                    ctx.setLineDash([1, 3]);
                }
                x = x + dx;
                y = y - my*parseFloat(i);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
            if (column.length > 0) labels.push([column[0] + ' (' + data.valueRanges[1].values[idx][numberOfGames] + ')', x+5, y+5]);
        }
        ctx.fillStyle = 'black';
        for (x of labels) {
            if ((prefix == "KC_") && (x[0].startsWith("Čmelo"))) {
                ctx.fillStyle = colors[0];
                ctx.fillText(x[0], x[1], x[2] - 10);
                ctx.fillStyle = 'black';
            } else if ((prefix == "KC_") && (x[0].startsWith("Matúš"))) {
                ctx.fillStyle = colors[4];
                ctx.fillText(x[0], x[1], x[2] + 10);
                ctx.fillStyle = 'black';
            } else {
                ctx.fillText(x[0], x[1], x[2]);
            }
        }
    }
  );
}

displayApp2();

addDice(6);

var shake = new Shake({threshold: 15, timeout: 1000});
window.addEventListener('shake', shakeEventHandler, false);

function debug(s) {
  // convert game state json to yaml (for better readability)
  if (s.startsWith('server: GAME_STATE ')) {
    s = `${s.slice(0, 19)}<pre>${jsyaml.dump(JSON.parse(s.slice(19)))}</pre>`;
  }
  document.getElementById("debuglogDiv").insertAdjacentHTML('beforeend', `<p>[${(new Date()).toTimeString().slice(0, 8)}] ${s}</p>`);
}

debug(`system: ${navigator.userAgent}`);
debug(`screen: ${window.screen.width}x${window.screen.height}`);
debug(`window: ${window.innerWidth}x${window.innerHeight}`);

function toggleShakeSetting(checked) {
  localStorage.setItem('setting1', checked);
  if (checked) {
    requestPermission();
    shake.start();
  } else {
    shake.stop();
  }
}

function toggleMoveSetting(checked) {
  localStorage.setItem('setting2', checked);
  document.styleSheets[0].cssRules[0].style.top = checked ? "-32vh" : "0";
}

function requestPermission() {
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function') {
    debug('requesting permission to access Device Motion ..');
    DeviceMotionEvent.requestPermission()
      .then(response => {debug(response);})
      .catch(() => {debug('failed');})
  }
}

function shakeEventHandler() {
  rollDice('.dice-roller');
}

function addDice(n) {
  var diceDiv = document.getElementById('diceDiv');
  var dice = diceDiv.querySelectorAll('.die-div');
  var numberOfDice = dice.length;
  if (n > 0 && n + numberOfDice <= 18) {
    for (let i = 0; i < n; i++) {
      diceDiv.insertAdjacentElement('beforeend', generateDieDiv(1, 'dice-roller'));
    }
  } else if (n == -1 && numberOfDice > 0) {
    diceDiv.removeChild(diceDiv.lastElementChild);
  }
}

function rollDice(selector, roll = null) {
  var dice = document.querySelectorAll(`${selector}.die-div:not(.revealed):not(.pre-revealed)`);
  console.log(dice);
  dice.forEach((die, i) => {rollDie(die, roll == null ? getRandomNumber(1, 6) : roll[i])});
}
function rollDie(dieDiv, roll) {
  var die = dieDiv.firstElementChild;
  die.style["transition-duration"] = `${Math.random() + 1.5}s`;
  die.classList.toggle("odd-roll");
  die.classList.toggle("even-roll");
  die.dataset.roll = roll;
}

function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDieDiv(roll, ...classes) {
  var div = document.createElement('div');
  div.classList.add('die-div', ...classes);
  // div.classList.add('blank');
  if (div.classList.contains('dice-roller')) {
    div.onclick = () => {div.classList.toggle('revealed'); event.stopPropagation()};
  } else if (div.classList.contains('my-die')) {
    div.onclick = () => {
      if (gMyTurn && !gRevealed && !div.classList.contains('revealed') && !div.classList.contains('blank')) {
        div.classList.toggle('pre-revealed');
        var d = document.querySelectorAll('.pre-revealed');
        document.getElementById('rollButton').disabled = gRolled && d.length == 0;
      }
    }
  }
  div.innerHTML = `
      <ol class="die-list ${Math.random() < 0.5 ? "even-roll" : "odd-roll"}" data-roll="${roll}">
        <li class="die-item" data-side="1">
          <span class="dot"></span>
        </li>
        <li class="die-item" data-side="2">
          <span class="dot"></span>
          <span class="dot"></span>
        </li>
        <li class="die-item" data-side="3">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </li>
        <li class="die-item" data-side="4">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </li>
        <li class="die-item" data-side="5">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </li>
        <li class="die-item" data-side="6">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </li>
      </ol>`
  return div;
}

function generatePlayerDiv(player) {
  var thisIsMe = player.nickname == myNickname;
  var playerDiv = document.createElement('div');
  var bid = player.bid == null ? '' : player.bid.quantity + DICE_DICT[player.bid.number];
  playerDiv.classList.add('playerDiv');
  playerDiv.innerHTML = `
      <div class="playerNameDiv" style="grid-area: name;">${player.nickname}</div>
      <div class="playerActionDiv" style="grid-area: action;">${bid}</div>
      <div class="playerTimeDiv" style="grid-area: time;">${toMMSS(player.time)}</div>
      <div class="playerDiceDiv" style="grid-area: dice;"></div>`
  var playerTimeDiv = playerDiv.querySelector('.playerTimeDiv');
  var playerDiceDiv = playerDiv.querySelector('.playerDiceDiv');
  player.revealedDice.forEach(roll => playerDiceDiv.insertAdjacentElement('beforeend', generateDieDiv(roll, 'revealed')));
  player.unrevealedDice.forEach(roll => playerDiceDiv.insertAdjacentElement('beforeend', generateDieDiv(roll, 'unrevealed')));
  var n = player.numberOfDice - player.revealedDice.length - player.unrevealedDice.length;
  var classes = ['blank'];
  if (thisIsMe) {
    gMyHiddenDice.forEach(roll => playerDiceDiv.insertAdjacentElement('beforeend', generateDieDiv(roll, 'my-die')));
    n -= gMyHiddenDice.length;
    classes.push('my-die')
  }
  for (let i = 0; i < n; i++) {
    playerDiceDiv.insertAdjacentElement('beforeend', generateDieDiv(1, ...classes));
  }
  if (player.isCurrentPlayer) {
    playerDiv.classList.add('currentPlayer');
    var clockTimeAnchor = Date.now();
    var time = 0;
    var w = 100 * player.delay / CLOCK_DELAY;
    document.onvisibilitychange = function () {
      if (document.visibilityState === 'visible') {
        var t1 = Math.round((Date.now() - clockTimeAnchor) / 1000) - 1;
        var t2 = Math.round((Date.now() - clockTimeAnchor) / (10 * CLOCK_DELAY));
        time = Math.max(0, t1 - player.delay);
        w = 100 * player.delay / CLOCK_DELAY - t2;
      }
    };
    var div = document.createElement('div');
    div.style = 'grid-area: time; position: relative; border: none; background: #00ff0040;';
    div.style.width = `${w}%`;
    playerDiv.insertAdjacentElement('beforeend', div);
    gInterval = setInterval(() => {
      w -= 1;
      if (w < 0) {
        div.style.width = '0';
        clearInterval(gInterval);
        gInterval = setInterval(() => {
          time += 1;
          playerTimeDiv.innerHTML = toMMSS(player.time - time);
        }, 1000);
      } else {
        div.style.width = `${w}%`;
      }
    }, 10 * CLOCK_DELAY);
  }
  return playerDiv;
}

function toMMSS(seconds) {
  return new Date(seconds * 1000).toISOString().substr(14, 5);
}

function processGameState(state) {
  if (gInterval !== null) clearInterval(gInterval);
  if (!gRolled) document.getElementById('rollButton').disabled = false;
  if (state.finished) setTimeout(() => {displayLobby();}, 10000);
  if (state.finishedRound) {
    gMyHiddenDice = [];
    gRolled = false;
    document.getElementById('rollButton').disabled = true;
  }
  // rotate the list of players to make me the last one
  var myIndex = state.players.findIndex(x => x.nickname == myNickname);
  var players = state.players.slice(myIndex+1).concat(state.players.slice(0, myIndex+1))
  // render game state
  var playersDiv = document.getElementById('playersDiv');
  playersDiv.replaceChildren(...players.map(x => generatePlayerDiv(x)));
  // enable / disable buttons
  gCurrentBidValue = bidValue(state.currentBid);
  gMyTurn = state.players[myIndex].isCurrentPlayer;
  if (gMyTurn) {
    document.getElementById('bidButton').disabled = gMyBidValue <= gCurrentBidValue;
    document.getElementById('challengeButton').disabled = (state.currentBid.quantity == 0 || gRevealed);
  } else {
    disableButtons();
  }
}


var socket;
function leaveLobby() {
  debug('leaving lobby');
  socket.send(`LEAVE`);
  socket.onerror = (e) => {debug("connection error");}
  socket.onclose = (e) => {debug("connection closed");}
  socket.close(1000);
  localStorage.removeItem('token');
  localStorage.removeItem('nickname');
  myNickname = '';
  document.getElementById('myNicknameDiv').innerHTML = '';
  document.getElementById('connectionStatusDiv').style.background = 'grey';
  displayLogin();
}
function enterLobby(button) {
  var nickname = document.getElementById("nickname").value;
  if (nickname == '') return;
  myNickname = nickname;
  // button.disabled = true;
  connectToServer();
}
function connectToServer() {
  debug("connecting to server ..");
  document.getElementById('connectionStatusDiv').style.background = 'blue';
  socket = new WebSocket(window.location.protocol == "https:" ? "wss://8.209.115.233:443" : "ws://localhost:8765");
  socket.onerror = (e) => {
    debug("connection error");
    document.getElementById('connectionStatusDiv').style.background = 'orange';
  }
  socket.onclose = (e) => {
    debug("connection closed");
    document.getElementById('connectionStatusDiv').style.background = 'red';
    socket = null;
    setTimeout(connectToServer, 5000);
  }
  socket.onopen = () => {
    debug("connection established");
    document.getElementById('connectionStatusDiv').style.background = 'green';
    var token = localStorage.getItem('token');
    if (token) {
      socket.send(`RECONNECT ${token}`);
    } else {
      socket.send(`ENTER ${myNickname}`);
    }
  }
  socket.onmessage = (e) => {
    var message = e.data;
    debug(`server: ${message}`);
    if (message.startsWith('ENTER_SUCCESS ')) {
      displayLobby();
      var token = msg2array(message)[0];
      localStorage.setItem('token', token);
      localStorage.setItem('nickname', myNickname);
      document.getElementById('myNicknameDiv').innerHTML = myNickname;
    }
    else if (message.startsWith('ENTER_ERROR ')) {
      //TODO display error
    }
    else if (message.startsWith('RECONNECT_SUCCESS')) {
      document.getElementById('loginDiv').style.display = 'none';
      if (document.getElementById('lobbyDiv').style.display == 'none' &&
          document.getElementById('waitingRoomDiv').style.display == 'none' &&
          document.getElementById('gameDiv').style.display == 'none') {
        displayLobby();
      }
      socket.send('GAME_STATE');
    }
    else if (message.startsWith('RECONNECT_ERROR ')) {
      leaveLobby();
    }
    else if (message.startsWith("PLAYERS ")) {
      document.getElementById("playersInLobbyList").innerHTML = msg2array(message).map(x => `<li>${x}</li>`).join('');
    }
    else if (message.startsWith("GAMES ")) {
      document.getElementById("gamesList").innerHTML = msg2array(message).map(x => `<li onclick="popupJoinGame('${x}')">${x}</li>`).join('');
    }
    else if (message.startsWith("PLAYERS_IN_GAME ")) {
      document.getElementById("playersInGameList").innerHTML = msg2array(message).map(x => `<li>${x}</li>`).join('');
    }
    else if (message.startsWith("JOIN_GAME_SUCCESS")) {
      displayWaitingRoom();
      document.getElementById('startGameButton').style.display = 'none';
    }
    else if (message.startsWith("JOIN_GAME_ERROR ")) {
      // TODO display this in the popup
      debug(message.slice(16));
    }
    else if (message.startsWith("GAME_ABANDONED")) {
      displayLobby();
    }
    else if (message.startsWith("GAME_STARTED")) {
      displayGame();
      document.getElementById('rollButton').disabled = false;
    }
    else if (message.startsWith("GAME_STATE ")) {
      displayGame();
      processGameState(JSON.parse(message.slice(11)))
    }
    else if (message.startsWith('ROLL ')) {
      gMyHiddenDice = msg2array(message).map(x => parseInt(x));
      var dice = document.querySelectorAll('.my-die.blank');
      setTimeout(() => {
        for (die of dice) die.classList.remove('blank');
        rollDice('.my-die', gMyHiddenDice);
      }, 50);
    }
    else if (message == 'INVALID_MOVE') {
      enableButtons();
    }
  }
}

function msg2array(msg) {
  var parts = msg.split(' ').slice(1);
  if (parts[0] == '') parts = [];
  return parts
}


function displayLogin() {
  document.getElementById('loginDiv').style.display = 'block';
  document.getElementById('lobbyDiv').style.display = 'none';
  document.getElementById('waitingRoomDiv').style.display = 'none';
  document.getElementById('gameDiv').style.display = 'none';
  // document.getElementById('nickname').focus();
}
function displayLobby() {
  document.getElementById('loginDiv').style.display = 'none';
  document.getElementById('lobbyDiv').style.display = 'grid';
  document.getElementById('waitingRoomDiv').style.display = 'none';
  document.getElementById('gameDiv').style.display = 'none';
}
function displayWaitingRoom() {
  document.getElementById('loginDiv').style.display = 'none';
  document.getElementById('lobbyDiv').style.display = 'none';
  document.getElementById('waitingRoomDiv').style.display = 'grid';
  document.getElementById('gameDiv').style.display = 'none';
}
function displayGame() {
  document.getElementById('loginDiv').style.display = 'none';
  document.getElementById('lobbyDiv').style.display = 'none';
  document.getElementById('waitingRoomDiv').style.display = 'none';
  document.getElementById('gameDiv').style.display = 'block';
}


function createGame(button) {
  var password = document.getElementById("createGamePassword").value;
  document.getElementById('popupContainer').click();
  debug("creating game ..");
  socket.send(`CREATE_GAME ${password}`);
  displayWaitingRoom();
  document.getElementById("startGameButton").style.display = "block";
}

function joinGame(button) {
  var creator = document.getElementById("joinGameCreator").innerHTML;
  var password = document.getElementById("joinGamePassword").value;
  document.getElementById('popupContainer').click();
  debug("joining game ..");
  socket.send(`JOIN_GAME ${creator} ${password}`);
}

function leaveGame() {
  debug("leaving game ..");
  socket.send(`LEAVE_GAME`);
  displayLobby();
}

function startGame() {
  debug("starting game ..");
  socket.send(`START_GAME`);
}

function popupJoinGame(creator) {
  document.getElementById('joinGameCreator').innerHTML = creator;
  popup('joinGameDiv');
}

function popup(divId) {
  document.getElementById('popupContainer').style.display = "block";
  document.getElementById(divId).style.display = "block";
}

document.getElementById('popupContainer').addEventListener('click', (e) => {
  e.target.style.display = "none";
  for (x of e.target.children) x.style.display = "none";
})



document.getElementById('bidQuantityUpDiv').addEventListener('click', (e) => {
  var div = document.getElementById('bidQuantityDiv');
  div.dataset.value -= -1;
  div.innerHTML = div.dataset.value;
  processBidChange();
})
document.getElementById('bidQuantityDownDiv').addEventListener('click', (e) => {
  var div = document.getElementById('bidQuantityDiv');
  if (div.dataset.value <= 1) return;
  div.dataset.value -= 1;
  div.innerHTML = div.dataset.value;
  processBidChange();
})
document.getElementById('bidNumberUpDiv').addEventListener('click', (e) => {
  var div = document.getElementById('bidNumberDiv');
  div.dataset.value -= -1;
  if (div.dataset.value == 7) div.dataset.value = 1;
  div.innerHTML = DICE_DICT[div.dataset.value];
  processBidChange();
})
document.getElementById('bidNumberDownDiv').addEventListener('click', (e) => {
  var div = document.getElementById('bidNumberDiv');
  div.dataset.value -= 1;
  if (div.dataset.value == 0) div.dataset.value = 6;
  div.innerHTML = DICE_DICT[div.dataset.value];
  processBidChange();
})


function processReveal() {
  var dice = document.querySelectorAll('.pre-revealed');
  if (dice.length > 0) {
    var message = 'REVEAL';
    for (die of dice) {
      die.classList.remove('pre-revealed');
      die.classList.add('revealed');
      message += ' ' + die.firstElementChild.dataset.roll;
    }
    socket.send(message);
    for (die of document.querySelectorAll('.my-die:not(.revealed)')) {
      die.classList.add('blank');
    }
    gMyHiddenDice = [];
    gRolled = false;
    gRevealed = true;
    document.getElementById('rollButton').disabled = false;
  }
}
document.getElementById('bidButton').addEventListener('click', (e) => {
  disableButtons()
  processReveal();
  gRevealed = false;
  var q = document.getElementById('bidQuantityDiv').dataset.value;
  var n = document.getElementById('bidNumberDiv').dataset.value;
  setTimeout(() => {socket.send(`BID ${q} ${n}`);}, 100);
})
document.getElementById('challengeButton').addEventListener('click', (e) => {
  disableButtons();
  gRevealed = false;
  socket.send(`CHALLENGE`);
})
document.getElementById('rollButton').addEventListener('click', (e) => {
  processReveal();
  gRolled = true;
  document.getElementById('rollButton').disabled = true;
  setTimeout(() => {socket.send(`ROLL`);}, 100);
})

function enableButtons() {
  document.getElementById('bidButton').disabled = false;
  document.getElementById('challengeButton').disabled = false;
  document.getElementById('rollButton').disabled = false;
}
function disableButtons() {
  document.getElementById('bidButton').disabled = true;
  document.getElementById('challengeButton').disabled = true;
}



// trigger button click by pressing Enter
document.getElementById("nickname").addEventListener("keydown", (e) => {
  if (e.keyCode === 13) {e.preventDefault(); document.getElementById("loginButton").click();}
})
document.getElementById("createGamePassword").addEventListener("keydown", (e) => {
  if (e.keyCode === 13) {e.preventDefault(); document.getElementById("createGameButton").click();}
})
document.getElementById("joinGamePassword").addEventListener("keydown", (e) => {
  if (e.keyCode === 13) {e.preventDefault(); document.getElementById("joinGameButton").click();}
})



var bidValue = bid => 6 * bid.quantity * (1 + (bid.number == 1)) + bid.number;
var gCurrentBidValue = 6;
var gMyBidValue = 8;
var gMyTurn = false;
var gRolled = false;
var gRevealed = false;
var gMyHiddenDice = [];
var gInterval = null;


function processBidChange() {
  var q = document.getElementById('bidQuantityDiv').dataset.value - 0;
  var n = document.getElementById('bidNumberDiv').dataset.value - 0;
  gMyBidValue = bidValue({'quantity': q, 'number': n});
  if (gMyTurn) {
    document.getElementById('bidButton').disabled = gMyBidValue <= gCurrentBidValue;
  }
}



function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

window.addEventListener('load', (e) => {
  debug(`localStorage available: ${storageAvailable('localStorage')}`);
  debug(`sessionStorage available: ${storageAvailable('sessionStorage')}`);
  document.getElementById('setting1').checked = localStorage.getItem('setting1') === 'true';
  document.getElementById('setting1').oninput();
  document.getElementById('setting2').checked = localStorage.getItem('setting2') === 'true';
  document.getElementById('setting2').oninput();
  var nickname = localStorage.getItem('nickname');
  if (nickname) {
    myNickname = nickname;
    document.getElementById('myNicknameDiv').innerHTML = nickname;
    if (localStorage.getItem('token')) {
      connectToServer();
    }
  }
});

window.addEventListener('offline', (e) => {
  debug(`offline`);
  document.getElementById('networkStatusDiv').style.background = 'grey';
});
window.addEventListener('online', (e) => {
  debug(`online`);
  document.getElementById('networkStatusDiv').style.background = 'green';
});

