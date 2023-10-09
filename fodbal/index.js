const NUMBER_OF_GAMES_TO_QUALIFY = 6;
g = {}

function initCheckbox(name, defaultValue) {
  g[name] = defaultValue;
  var storedValue = localStorage.getItem(name);
  if (storedValue !== null) {
    g[name] = storedValue === 'true';
    document.getElementById(name).checked = g[name];
  }
}

function initRadio(name, defaultValue) {
  g[name] = defaultValue;
  var storedValue = localStorage.getItem(name);
  if (storedValue !== null) {
    g[name] = storedValue;
    document.getElementById(g[name]).checked = true;
  }
}

function setInput(name, value) {
  debug(`${name}: ${value}`);
  localStorage.setItem(name, value);
  g[name] = value;
}

function setPlotOptionStyle(input) {
  input.parentElement.style['background-color'] = input.checked ? '#ffff99' : 'white';
}

function setPlotOption(input) {
  setPlotOptionStyle(input);
  setInput(input.id, input.checked);
  renderPlot();
}

function setFilter(filter) {
  setInput('filter', filter);
  filterPlayers();
  resetTeams();
  render();
}

function filterPlayers() {
  for (const [i, player] of gPlayers.entries()) {
    if (g.filter == 'filterAll') {
      player.checked = true;
    } else if (g.filter == 'filterQualified') {
      player.checked = player.games >= NUMBER_OF_GAMES_TO_QUALIFY;
    } else if (g.filter == 'filterRegulars') {
      player.checked = i < 10;
    } else if (g.filter == 'filterSubstitutes') {
      player.checked = i >= 10 && player.games > 0;
    }
  }
}

function togglePlayer(i, checked) {
  debug(`name: ${gPlayers[i].name}, checked: ${checked}`);
  gPlayers[i].checked = checked;
  resetTeams();
  render();
}

function checkedPlayers() {
  return gPlayers.filter(x => x.checked);
}

function displayGraph(season) {
  var sheetName;
  if (season == "2014") sheetName = "zaloha%20tabuliek%20za%20rok%202013%2F14";
  if (season == "2015") sheetName = "zaloha%20Tabuliek%202014%2F15";
  if (season == "2016") sheetName = "zaloha%20tabuliek%202015%2F16";
  if (season == "2017") sheetName = "zaloha%20tabuliek%202016%2F17";
  if (season == "2018") sheetName = "zaloha%20tabuliek%202017%2F18";
  if (season == "2019") sheetName = "zaloha%20tabuliek%202018%2F19";
  if (season == "2020") sheetName = "TABULKY_19%2F20";
  if (season == "2021") sheetName = "TABULKY_20%2F21";
  if (season == "2022") sheetName = "TABULKY_21%2F22";
  if (season == "2023") sheetName = "TABULKY_22%2F23";
  if (season == "2024") sheetName = "TABULKY_23%2F24";
  var url = `https://sheets.googleapis.com/v4/spreadsheets/1ttG0bK-tLzMPgohBYvAR7Xx9sTXLpSmnagyNxzOcvjQ/values/${sheetName}!A1:GG100?majorDimension=ROWS&key=AIzaSyCLvFHhl5l1iNKv2PaJM7n8eSftTCX8OTE`;
  $.get(url, processData);
}

function processData(data) {
  gPlayers = [];
  for (const row of data.values) {
    if (row[1] === '0' || row[1] > 0) {
      var games = Number(row[1]);
      var player = {
        'name': row[0],
        'games': games,
        'p1': games == 0 ? 1 : Number(row[6].replace(',', '.')), // priemerne zapasove body
        'p2': games == 0 ? 1 : Number(row[9].replace(',', '.')), // priemerne kanadske body
        'pp1': NaN,
        'pp2': NaN,
        'checked': true,
        'textColor': games > 0 ? 'black' : 'grey',
        'markerColor': gPlayers.length < 10 ? 'red' : 'blue',
        'markerLineColor': gPlayers.length < 10 ? 'red' : 'blue',
        'markerSize': games / 2 + 5,
      };
      if (games > 2 && row.length > 12) {
        player.pp1 = (player.p1 * games - row[row.length-3]) / (games - 2);
        player.pp2 = (player.p2 * games - row[row.length-2] - row[row.length-1]) / (games - 2);
      }
      gPlayers.push(player);
    }
  }
  filterPlayers();
  render();
}

function resetTeams() {
  for (const p of gPlayers) {
    p.markerColor = p.markerLineColor;
  }
}

function psum(players, p) {
  if (g.weights == 'weights1') {
    return players.reduce((acc, next) => acc + next[p] / players.length, 0);
  }
  if (g.weights == 'weights2') {
    var N = players.reduce((acc, next) => acc + next.games, 0);
    return players.reduce((acc, next) => acc + next[p] * next.games / N, 0);
  }
  if (g.weights == 'weights3') {
    var N = players.reduce((acc, next) => acc + Math.log(1 + next.games), 0);
    return players.reduce((acc, next) => acc + next[p] * Math.log(1 + next.games) / N, 0);
  }
}
var p1sum = players => psum(players, 'p1');
var p2sum = players => psum(players, 'p2');
var numberOfSubs = players => players.reduce((p, n) => p + (n.markerLineColor == 'red' ? 0 : 1), 0);

async function createOptimalTeams() {
  document.getElementById('teamsDiv').style.display = 'none';
  var players = checkedPlayers();
  if (players.length != 10) return;
  var subsTotal = numberOfSubs(players);
  var p1best = 1000;
  var p2best = 1000;
  var p3best = 1000;
  var team1;
  for (const team of combinationN(players, 5)) {
    var team2 = players.filter(x => !team.includes(x));
    var p1diff = p1sum(team2) - p1sum(team);
    var p2diff = p2sum(team2) - p2sum(team);
    var p1 = Math.abs(p1diff);
    var p2 = Math.abs(p2diff);
    var p3 = p1 + p2 + Math.abs(p1diff + p2diff);
    var subsDiff = Math.abs(subsTotal - 2*numberOfSubs(team));
    var isBetter;
    if (g.priority == 'priority1') isBetter = (p1 < p1best || (p1 == p1best && p2 < p2best));
    if (g.priority == 'priority2') isBetter = (p2 < p2best || (p2 == p2best && p1 < p1best));
    if (g.priority == 'priority3') isBetter = (p3 < p3best || (p3 == p3best && p1 < p1best));
    if (g.evenSubstitutes) isBetter &&= subsDiff <= 1;
    if (isBetter) {
      team1 = team;
      p1best = p1;
      p2best = p2;
      p3best = p3;
      for (const p of players) p.markerColor = 'black';
      for (const p of team) p.markerColor = 'white';
      renderPlot();
      await new Promise(r => setTimeout(r, 100));
    }
  }
  var team2 = players.filter(x => !team1.includes(x));
  // swap teams if necessary, so that team1 is the stronger team
  if (p1sum(team1) < p1sum(team2)) {
    [team1, team2] = [team2, team1];
    for (const p of team1) p.markerColor = 'white';
    for (const p of team2) p.markerColor = 'black';
    renderPlot();
  }
  team1.sort((a, b) => b.p2 - a.p2);
  team2.sort((a, b) => b.p2 - a.p2);
  document.getElementById("teamsTable").innerHTML = `
    <tr><th style="width: 50%;">bieli</th><th style="width: 50%;">cierni</th></tr>
    <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
    ${[...Array(5).keys()].map(i => `<tr><td>${team1[i].name}</td><td>${team2[i].name}</td></tr>`).join('')}
    <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td colspan="2">priemer timu (zapasove, kanadske body)</td></tr>
    <tr><td>(${p1sum(team1).toFixed(2)}, ${p2sum(team1).toFixed(2)})</td><td>(${p1sum(team2).toFixed(2)}, ${p2sum(team2).toFixed(2)})</td></tr>
  `
  document.getElementById('teamsDiv').style.display = 'block';
}

function render() {
  document.getElementById('checkedPlayersNumber').innerText = checkedPlayers().length;
  document.getElementById('createOptimalTeamsButton').disabled = checkedPlayers().length != 10;
  renderPlayersList();
  renderPlot();
}

function renderPlayersList() {
  document.getElementById("playersList").innerHTML = gPlayers.map((x, i) =>
    `<li><label><input type="checkbox" ${x.checked ? 'checked' : ''} onchange="togglePlayer(${i}, this.checked)">${x.name}</label></li>`
  ).join('');
}

function renderPlot() {
  var players = checkedPlayers();
  var showTeams = (players.length == 10 && players[0].markerColor != players[0].markerLineColor);
  var data = [{
    x: players.map(x => x.p1),
    y: players.map(x => x.p2),
    text: players.map(x => x.name),
    textfont: {
      color: players.map(x => x.textColor),
    },
    textposition: 'center right',
    cliponaxis: false,
    marker: {
      size: players.map(x => x.markerSize),
      color: players.map(x => x.markerColor),
      opacity: 0.9,
      line: {
        color: players.map(x => x.markerLineColor),
        width: 1,
      },
    },
    mode: "markers+text",
  }];
  if (g.plotShifts) {
    for (player of players) {
      data.unshift({
        mode: 'lines+markers',
        x: [player.p1, player.pp1],
        y: [player.p2, player.pp2],
        line: {color: 'grey', width: 1, dash: 'dot'},
        marker: {size: [0, player.markerSize], opacity: [0, 0.8], line: {width: 0}},
      });
    }
  }
  if (showTeams) {
    data.unshift(generateWeb(players.filter(x => x.markerColor == 'black'), 'black'));
    data.unshift(generateWeb(players.filter(x => x.markerColor == 'white'), 'white'));
  } else if (g.plotAverage) {
    data.unshift(generateWeb(players, 'grey'));
  }
  Plotly.react("myPlot2", data, generateLayout(g.autoRange));
}

function generateLayout(autorange) {
  return {
    xaxis: {autorange: autorange, range: [0, 2], title: "priemerne zapasove body"},
    yaxis: {autorange: autorange, range: [0, 4], title: "priemerne kanadske body"},
    font: {size: 20},
    paper_bgcolor: "lightgrey",
    plot_bgcolor: "lightgrey",
    showlegend: false,
    margin: {t: 20},
  };
}

function generateWeb(team, color) {
  if (team.length == 0) return {};
  var p1 = p1sum(team);
  var p2 = p2sum(team);
  var x = [p1];
  var y = [p2];
  var markerSizes = [10];
  for (const player of team) {
    x.push(player.p1);
    x.push(p1);
    y.push(player.p2);
    y.push(p2);
    markerSizes.push(0);
    markerSizes.push(10);
  }
  return {
    mode: 'lines+markers',
    line: {color: color, width: 2},
    marker: {size: markerSizes, symbol: 'square', line: {width: 0}},
    x: x,
    y: y,
    opacity: 0.7,
  };
}

function debug(s) {
  document.getElementById("debuglogDiv").insertAdjacentHTML('beforeend', `<p>[${(new Date()).toTimeString().slice(0, 8)}] ${s}</p>`);
}

function popup(divId, display = 'block') {
  document.getElementById('popupContainer').style.display = "block";
  document.getElementById(divId).style.display = display;
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

function* combinationN(array, n) {
  if (n === 1) {
    for (const a of array) {
      yield [a];
    }
    return;
  }
  for (let i = 0; i <= array.length - n; i++) {
    for (const c of combinationN(array.slice(i + 1), n - 1)) {
      yield [array[i], ...c];
    }
  }
}

window.addEventListener('load', (e) => {
  debug(`system: ${navigator.userAgent}`);
  debug(`screen: ${window.screen.width}x${window.screen.height}`);
  debug(`window: ${window.innerWidth}x${window.innerHeight}`);
  debug(`localStorage available: ${storageAvailable('localStorage')}`);
  debug(`sessionStorage available: ${storageAvailable('sessionStorage')}`);
  initCheckbox('evenSubstitutes', true);
  initRadio('priority', 'priority3');
  initRadio('weights', 'weights3');
  initRadio('filter', 'filterRegulars');
  initCheckbox('plotAverage', false);
  initCheckbox('plotShifts', false);
  initCheckbox('autoRange', false);
  setPlotOptionStyle(document.getElementById('plotAverage'));
  setPlotOptionStyle(document.getElementById('plotShifts'));
  setPlotOptionStyle(document.getElementById('autoRange'));
  Plotly.newPlot("myPlot2", [], generateLayout(false));
  document.getElementById('myPlot2').on('plotly_doubleclick', (e) => {
    g.autoRange = !g.autoRange;
    localStorage.setItem('autoRange', g.autoRange);
    document.getElementById('autoRange').checked = g.autoRange;
    setPlotOptionStyle(document.getElementById('autoRange'));
  });
  displayGraph('2024');
});


function toggleMaximized(element, event) {
  event.stopPropagation();
  if (!['h1', 'input', 'label', 'button', 'span'].includes(event.target.tagName.toLowerCase())) {
    element.classList.toggle('maximized');
    if (element.id == 'changelogDiv') document.getElementById('debuglogDiv').classList.toggle('maximized');
    if (element.id == 'debuglogDiv') document.getElementById('changelogDiv').classList.toggle('maximized');
  }
}
