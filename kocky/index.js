const SOUND_GAME_STARTED = new Audio('res/sounds/game_started.mp3');
const SOUND_MY_TURN = new Audio('res/sounds/my_turn.mp3');
const SOUND_PLAYER_BIDS = new Audio('res/sounds/player_bids.mp3');
const SOUND_PLAYER_REVEALS = new Audio('res/sounds/player_reveals.mp3');
const SOUND_PLAYER_CHALLENGES = new Audio('res/sounds/player_challenges.mp3');
const SOUND_ROLL_DICE = new Audio('res/sounds/roll_dice.mp3');

const DICE_DICT = {1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'};
var CLOCK_DELAY = 15;

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

var gLabelAllPoints = false;
canvas.addEventListener('click', (e) => {
  gLabelAllPoints = !gLabelAllPoints
  drawGraph(gData);
});

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
  var url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${prefix}body!B1:Z1000&ranges=${prefix}kumulativne%20body!B2:Z1000&majorDimension=COLUMNS&key=AIzaSyCLvFHhl5l1iNKv2PaJM7n8eSftTCX8OTE`;
  gNumberOfGamesToQualify = prefix == "" ? 6 : 0;
  $.get(url, (data) => {gData = data; drawGraph(data);});
}

function drawGraph(data) {
    ctx.restore();
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 2vmin sans-serif';
    ctx.textBaseline = 'middle';
    var c = 0;
    var labels = [];
    var lowestScore = Math.min(...data.valueRanges[1].values.map(x => Math.min(...x.map(parseFloat))));
    var highestScore = Math.max(...data.valueRanges[1].values.map(x => Math.max(...x.map(parseFloat))));
    var numberOfGames = data.valueRanges[1].values[0].length - 1;
    var currentHighestScore = Math.max(...data.valueRanges[1].values.map(x => parseFloat(x[numberOfGames])));
    ctx.fillText('games: ' + numberOfGames, 50, 50);
    var dx = 0.8 * canvas.width / numberOfGames;
    var sx = 0.02 * canvas.width;
    var sy = 0.9 * canvas.height * highestScore / (highestScore - lowestScore) + 0.05 * canvas.height;
    var my = 0.9 * canvas.height / (highestScore - lowestScore);
    for ([idx, column] of data.valueRanges[0].values.entries()) {
        c %= colors.length;
        var color = colors[c++];
        if (column.filter(x => x != "").length < gNumberOfGamesToQualify + 1) color = 'grey';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        var x = sx;
        var y = sy;
        var started = false;
        for ([ii, i] of column.slice(2).entries()) {
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
            if (gLabelAllPoints && parseFloat(i) != 0 && ii < column.length - 3) {
                ctx.fillText(data.valueRanges[1].values[idx][ii + 1], x + 5, y);
            }
        }
        if (column.length > 0) {
            let currentScore = data.valueRanges[1].values[idx][numberOfGames];
            let label = column[0] + ' (' + currentScore + ')'
            if (currentScore == currentHighestScore) label += ' 👑'
            labels.push([label, x, y, 0, false, color]); // [label, x, y, yShift, isOverlapping, color]
        }
    }
    // space out labels so they don't overlap
    let m = ctx.measureText('()');
    let h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const epsilon = 0.001
    for ([i, x] of labels.entries()) {
        for ([j, y] of labels.entries()) {
            if (i <= j) continue;
            if (x[1] == y[1] ||
              (x[1] < y[1] && ctx.measureText(x[0]).width > y[1] - x[1]) ||
              (x[1] > y[1] && ctx.measureText(y[0]).width > x[1] - y[1])) {
                let d = y[2] - x[2];
                let ad = Math.abs(d);
                let s = h*h/(h+ad)/2;
                if (d < epsilon) s = -s;
                x[3] -= s
                y[3] += s
            }
            if (Math.abs(x[1] - y[1]) < epsilon && Math.abs(x[2] - y[2]) < epsilon) {
                x[4] = true;
                y[4] = true;
            }
        }
    }
    for (x of labels) {
        ctx.fillStyle = (x[4] || x[5] == 'grey') ? x[5] : 'black';
        ctx.fillText(x[0], x[1] + 5, x[2] + x[3]);
    }
}

displayApp2();

addDice(6);

var shake = new Shake({threshold: 15, timeout: 1000});
window.addEventListener('shake', shakeEventHandler, false);

function debug(s) {
  // don't put gamelog messages in debuglog
  if (s.startsWith('server: GAME_LOG')) {
    return;
  }
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

function toggleSetting3(checked) {
  localStorage.setItem('setting3', checked);
  document.getElementById('diceCounterDiv').style.display = checked ? 'grid' : 'none';
  document.getElementById('playersDiv').style.height = checked ? '77%' : '80%';
}

function toggleSetting4(checked) {
  localStorage.setItem('setting4', checked);
  gConfirmB = checked;
}
function toggleSetting5(checked) {
  localStorage.setItem('setting5', checked);
  gConfirmC = checked;
}
function toggleSetting6(checked) {
  localStorage.setItem('setting6', checked);
  gConfirmR = checked;
}
function toggleSetting7(checked) {
  localStorage.setItem('setting7', checked);
  gConfirmBB = checked;
}
function toggleSetting8(checked) {
  localStorage.setItem('setting8', checked);
  gAutoSetBidQuantity = checked;
}
function toggleSetting9(checked) {
  localStorage.setItem('setting9', checked);
  gSounds = checked;
}
function toggleSetting10(checked) {
  localStorage.setItem('setting10', checked);
  gVibrate = checked;
}
function toggleSetting11(checked) {
  localStorage.setItem('setting11', checked);
  gAnimation = checked;
}

function playSound(sound) {
  if (gSounds) sound.play();
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
  playSound(SOUND_ROLL_DICE);
  var animation = gAnimation || selector == '.dice-roller';
  dice.forEach((die, i) => {rollDie(die, roll == null ? getRandomNumber(1, 6) : roll[i], animation)});
}
function rollDie(dieDiv, roll, animation) {
  var die = dieDiv.firstElementChild;
  die.style["transition-duration"] = animation ? `${Math.random() + 1.5}s` : `0s`;
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
      <div class="playerHeader playerNameDiv" style="grid-area: name;">${player.nickname}</div>
      <div class="playerHeader playerActionDiv" style="grid-area: action;">${bid}</div>
      <div class="playerHeader playerTimeDiv" style="grid-area: time;">${toMMSS(player.time)}</div>
      <div class="playerHeader playerWPDiv" style="grid-area: wp;">${player.wp}</div>
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
    var w = CLOCK_DELAY == 0 ? 0 : 100 * player.delay / CLOCK_DELAY;
    document.onvisibilitychange = function () {
      if (document.visibilityState === 'visible') {
        var t1 = Math.round((Date.now() - clockTimeAnchor) / 1000) - 1;
        var t2 = Math.round((Date.now() - clockTimeAnchor) / (10 * CLOCK_DELAY));
        time = Math.max(0, t1 - player.delay);
        w = CLOCK_DELAY == 0 ? 0 : 100 * player.delay / CLOCK_DELAY - t2;
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

function sendAddBot() {
  var level = document.getElementById('botSelect').value;
  socket.send(`ADD_BOT ${level}`);
}

function sendGameOptions() {
  options = {
    'minutesPerGame': parseInt(document.getElementById('option1').value),
    'secondsPerTurn': parseInt(document.getElementById('option2').value),
    'startingNumberOfDice': parseInt(document.getElementById('option3').value),
    'startingNumberOfDiceEqualsNicknameLength': document.getElementById('option4').checked,
    'randomOrder': document.getElementById('option5').checked,
  };
  socket.send(`GAME_OPTIONS ${JSON.stringify(options)}`);
}

function processGameState(state) {
  if (!state.started) {
    displayWaitingRoom();
    document.getElementById("playersInGameList").innerHTML = state.players.map(x => `<li>${x.nickname}${x.isReady ? ' (ready)' : ''}</li>`).join('');
    var isMyGame = state.players[0].nickname == myNickname;
    for (let i = 1; i <= 5; i++) {
      var element = document.getElementById(`option${i}`);
      element.disabled = !isMyGame;
    }
    document.getElementById('addBotButton').disabled = !isMyGame;
    document.getElementById('option1').value = state.options.minutesPerGame;
    document.getElementById('option1').oninput();
    document.getElementById('option2').value = state.options.secondsPerTurn;
    document.getElementById('option2').oninput();
    CLOCK_DELAY = state.options.secondsPerTurn;
    document.getElementById('option3').value = state.options.startingNumberOfDice;
    document.getElementById('option3').oninput();
    document.getElementById('option4').checked = state.options.startingNumberOfDiceEqualsNicknameLength;
    document.getElementById('option5').checked = state.options.randomOrder;
    return;
  }
  displayGame();
  if (gInterval !== null) clearInterval(gInterval);
  if (!gRolled) document.getElementById('rollButton').disabled = false;
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
  setSpectatorMode(myIndex == -1 || state.players[myIndex].numberOfDice == 0 || state.finished);
  gCurrentBid = state.currentBid;
  gMyTurn = myIndex > -1 && state.players[myIndex].isCurrentPlayer;
  if (gMyTurn) {
    playSound(SOUND_MY_TURN);
    if (gVibrate) navigator.vibrate([100,50,100]);
    document.getElementById('bidButton').disabled = bidValue(gMyBid) <= bidValue(gCurrentBid);
    document.getElementById('challengeButton').disabled = (state.currentBid.quantity == 0 || gRevealed);
  } else {
    disableButtons();
  }
  // update dice counter
  document.getElementById('counterAll').innerHTML = document.querySelectorAll('div.die-div:not(.dice-roller)').length;
  document.getElementById('counterBlank').innerHTML = document.querySelectorAll('div.die-div:not(.dice-roller).blank').length;
  var dice = [...document.querySelectorAll('div.die-div:not(.dice-roller).revealed, div.die-div:not(.dice-roller).unrevealed')];
  var counter1 = dice.filter(x => x.firstElementChild.dataset.roll == '1').length;
  document.getElementById('counter1').innerHTML = counter1;
  document.getElementById('counter2').innerHTML = dice.filter(x => x.firstElementChild.dataset.roll == '2').length + counter1;
  document.getElementById('counter3').innerHTML = dice.filter(x => x.firstElementChild.dataset.roll == '3').length + counter1;
  document.getElementById('counter4').innerHTML = dice.filter(x => x.firstElementChild.dataset.roll == '4').length + counter1;
  document.getElementById('counter5').innerHTML = dice.filter(x => x.firstElementChild.dataset.roll == '5').length + counter1;
  document.getElementById('counter6').innerHTML = dice.filter(x => x.firstElementChild.dataset.roll == '6').length + counter1;
  document.getElementById('counter1Div').classList.remove('highlighted');
  document.getElementById('counter2Div').classList.remove('highlighted');
  document.getElementById('counter3Div').classList.remove('highlighted');
  document.getElementById('counter4Div').classList.remove('highlighted');
  document.getElementById('counter5Div').classList.remove('highlighted');
  document.getElementById('counter6Div').classList.remove('highlighted');
  if (state.currentBid.quantity != 0) document.getElementById(`counter${state.currentBid.number}Div`).classList.add('highlighted');
}

function setSpectatorMode(b) {
  document.getElementById('leaveGameDiv').style.display = b ? 'block' : 'none';
  document.getElementById('bidControllerDiv').style.display = b ? 'none' : 'grid';
  document.getElementById('bidButton').style.display = b ? 'none' : 'block';
  document.getElementById('challengeButton').style.display = b ? 'none' : 'block';
  document.getElementById('rollButton').style.display = b ? 'none' : 'block';
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
  if (gConnectionAttempts >= 3) {
    popupError('connecting to server failed');
    gConnectionAttempts = 0;
    return;
  }
  gConnectionAttempts += 1;
  debug("connecting to server ..");
  document.getElementById('connectionStatusDiv').style.background = 'blue';
  socket = new WebSocket(window.location.protocol == "https:" ? "wss://marekkukan.mooo.com:443" : "ws://localhost:8765");
  socket.onerror = (e) => {
    debug("connection error");
    document.getElementById('connectionStatusDiv').style.background = 'orange';
  }
  socket.onclose = (e) => {
    debug("connection closed");
    document.getElementById('connectionStatusDiv').style.background = 'red';
    socket = null;
    setTimeout(connectToServer, 3000);
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
      popupError(message.slice(12));
    }
    else if (message.startsWith('RECONNECT_SUCCESS')) {
      document.getElementById('loginDiv').style.display = 'none';
      if (document.getElementById('lobbyDiv').style.display == 'none' &&
          document.getElementById('waitingRoomDiv').style.display == 'none' &&
          document.getElementById('gameDiv').style.display == 'none') {
        displayLobby();
      }
      socket.send('GAME_STATE');
      socket.send('GAME_LOG');
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
    else if (message.startsWith("JOIN_GAME_SUCCESS")) {
      displayWaitingRoom();
    }
    else if (message.startsWith("JOIN_GAME_ERROR ")) {
      popupError(message.slice(16))
    }
    else if (message.startsWith("GAME_ABANDONED")) {
      displayLobby();
    }
    else if (message.startsWith("GAME_STARTED")) {
      displayGame();
      playSound(SOUND_GAME_STARTED);
      document.getElementById('rollButton').disabled = false;
    }
    else if (message.startsWith("GAME_STATE ")) {
      processGameState(JSON.parse(message.slice(11)));
    }
    else if (message.startsWith("GAME_LOG_RECORD ")) {
      document.getElementById('gamelogP').insertAdjacentHTML('afterbegin', message.slice(16));
    }
    else if (message.startsWith("GAME_LOG ")) {
      document.getElementById('gamelogP').innerHTML = message.slice(9);
    }
    else if (message.startsWith('ROLL ')) {
      gMyHiddenDice = msg2array(message).map(x => parseInt(x));
      var dice = document.querySelectorAll('.my-die.blank');
      setTimeout(() => {
        for (die of dice) die.classList.remove('blank');
        document.getElementById('counterBlank').innerHTML = document.querySelectorAll('div.die-div:not(.dice-roller).blank').length;
        rollDice('.my-die', gMyHiddenDice);
      }, 50);
    }
    else if (message == 'INVALID_MOVE') {
      enableButtons();
    }
    else if (message == 'PLAYER_BIDS') {
      playSound(SOUND_PLAYER_BIDS);
    }
    else if (message == 'PLAYER_REVEALS') {
      playSound(SOUND_PLAYER_REVEALS);
    }
    else if (message == 'PLAYER_CHALLENGES') {
      playSound(SOUND_PLAYER_CHALLENGES);
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

function toggleReady() {
  debug("toggling ready ..");
  socket.send(`READY`);
}

function popupJoinGame(creator) {
  document.getElementById('joinGameCreator').innerHTML = creator;
  popup('joinGameDiv');
}

function popupError(message) {
  document.getElementById('errorSpan').innerHTML = message;
  popup('errorDiv');
}

function popup(divId, display = 'block') {
  document.getElementById('popupContainer').style.display = "block";
  document.getElementById(divId).style.display = display;
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
  autoSetBidQuantity(div.dataset.value);
  processBidChange();
})
document.getElementById('bidNumberDownDiv').addEventListener('click', (e) => {
  var div = document.getElementById('bidNumberDiv');
  div.dataset.value -= 1;
  if (div.dataset.value == 0) div.dataset.value = 6;
  div.innerHTML = DICE_DICT[div.dataset.value];
  autoSetBidQuantity(div.dataset.value);
  processBidChange();
})


function confirmMove(needsConfirmation, moveString, moveFunction) {
  if (needsConfirmation) {
    document.getElementById('confirmP').innerHTML = moveString;
    document.getElementById('confirmDiv').onclick = (e) => {
      e.stopPropagation();
      document.getElementById('popupContainer').click();
      moveFunction();
    };
    popup('confirmDiv', 'flex');
  } else {
    moveFunction();
  }
}

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
  var q = document.getElementById('bidQuantityDiv').dataset.value - 0;
  var n = document.getElementById('bidNumberDiv').dataset.value - 0;
  var moveString = 'bid ' + q + DICE_DICT[n];
  var needsConfirmation = gConfirmB || (gConfirmBB && isBigBid({'quantity': q, 'number': n}));
  var dice = document.querySelectorAll('.pre-revealed');
  if (dice.length > 0) {
    moveString = 'reveal ' + [...dice].map(x => DICE_DICT[x.firstElementChild.dataset.roll-0]).join(' ') + '<br>' + moveString;
    needsConfirmation = gConfirmR || needsConfirmation;
  }
  confirmMove(needsConfirmation, moveString, () => {
    disableButtons()
    processReveal();
    gRevealed = false;
    setTimeout(() => {socket.send(`BID ${q} ${n}`);}, 100);
  });
})
document.getElementById('challengeButton').addEventListener('click', (e) => {
  confirmMove(gConfirmC, 'challenge', () => {
    disableButtons();
    gRevealed = false;
    socket.send(`CHALLENGE`);
  });
})
document.getElementById('rollButton').addEventListener('click', (e) => {
  var moveString = '';
  var needsConfirmation = false;
  var dice = document.querySelectorAll('.pre-revealed');
  if (dice.length > 0) {
    moveString = 'reveal ' + [...dice].map(x => DICE_DICT[x.firstElementChild.dataset.roll-0]).join(' ');
    needsConfirmation = gConfirmR;
  }
  confirmMove(needsConfirmation, moveString, () => {
    processReveal();
    gRolled = true;
    document.getElementById('rollButton').disabled = true;
    setTimeout(() => {socket.send(`ROLL`);}, 100);
  });
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
var isBigBid = bid => bidValue({'quantity': bid.quantity - 1, 'number': bid.number}) > bidValue(gCurrentBid)
var gCurrentBid = {'quantity': 0, 'number': 6};
var gMyBid = {'quantity': 1, 'number': 2};
var gMyTurn = false;
var gRolled = false;
var gRevealed = false;
var gMyHiddenDice = [];
var gInterval = null;


function processBidChange() {
  var q = document.getElementById('bidQuantityDiv').dataset.value - 0;
  var n = document.getElementById('bidNumberDiv').dataset.value - 0;
  gMyBid = {'quantity': q, 'number': n};
  if (gMyTurn) {
    document.getElementById('bidButton').disabled = bidValue(gMyBid) <= bidValue(gCurrentBid);
  }
}

function minQ(bid, n) {
  if (bid.number == 1) return n == 1 ? bid.quantity + 1 : bid.quantity * 2;
  if (n > bid.number) return bid.quantity;
  return n == 1 ? Math.floor(bid.quantity / 2) + 1 : bid.quantity + 1;
}

function autoSetBidQuantity(bidNumber) {
  if (gAutoSetBidQuantity) {
    var div = document.getElementById('bidQuantityDiv');
    var q = minQ(gCurrentBid, bidNumber);
    div.dataset.value = q;
    div.innerHTML = q;
  };
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
  for (let i = 1; i <= 11; i++) {
    var element = document.getElementById(`setting${i}`);
    var storedValue = localStorage.getItem(`setting${i}`);
    if (storedValue !== null) element.checked = storedValue === 'true';
    element.oninput();
  }
  gConnectionAttempts = 0;
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
