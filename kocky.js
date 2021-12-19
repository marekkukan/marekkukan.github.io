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
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
ctx.save();

function displayApp() {
  app.style.display = "block";
  canvas.style.display = "none";
}

function displayGraph(season, prefix = "") {
  app.style.display = "none";
  canvas.style.display = "initial";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.9;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var spreadsheetId;
  if (season == "2020") spreadsheetId = "1SMSHgI_VwedJJFKElNIdlErG83lAum5I2SvgElYS6eU";
  if (season == "2021") spreadsheetId = "1ffUJY2jo2mX_1tJ1OmZ_Dxp41sEBthG6KEEjwTsXS0M";
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

displayGraph("2021");

var numberOfDice = 0;
addDice(6);

var shake = new Shake({threshold: 15, timeout: 1000});
window.addEventListener('shake', shakeEventHandler, false);

function debug(s) {
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
  rollDice();
}

function addDice(n, diceDiv = document.getElementById("diceDiv")) {
  if (n > 0 && n + numberOfDice <= 18) {
    for (let i = 0; i < n; i++) {
      diceDiv.insertAdjacentHTML('beforeend', generateDieDiv(numberOfDice));
      numberOfDice += 1;
    }
  }
  if (n == -1) {
    if (numberOfDice > 0) {
      diceDiv.removeChild(diceDiv.lastElementChild);
      numberOfDice -= 1;
    }
  }
}

function rollDice() {
  const dice = [...document.querySelectorAll(".die-div:not(.revealed)")].map(x => x.firstElementChild);
  dice.forEach(die => {
    die.style["transition-duration"] = `${Math.random() + 1.5}s`;
    die.classList.toggle("odd-roll");
    die.classList.toggle("even-roll");
    die.dataset.roll = getRandomNumber(1, 6);
  });
}

function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDieDiv(name) {
  roll = Math.random() < 0.5 ? "even-roll" : "odd-roll";
  return `
    <div class="die-div" onclick="this.classList.toggle('revealed'); event.stopPropagation()">
      <ol class="die-list ${roll}" data-roll="1" id="die${name}">
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
      </ol>
    </div>`
}

function popup(divId) {
  document.getElementById('popupContainer').style.display = "block";
  document.getElementById(divId).style.display = "block";
}

document.getElementById('popupContainer').addEventListener('click', (e) => {
  e.target.style.display = "none";
  for (x of e.target.children) x.style.display = "none";
})


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
});

