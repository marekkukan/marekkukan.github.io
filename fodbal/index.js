const NUMBER_OF_GAMES_TO_QUALIFY = 6;

function setEvenSubstitutes(checked) {
  debug(`evenSubstitutes: ${checked}`);
  localStorage.setItem('evenSubstitutes', checked);
  gEvenSubstitutes = checked;
}

function setPriority(priority) {
  debug(`priority: ${priority}`);
  localStorage.setItem('priority', priority);
  gPriority = priority;
}

function setFilter(filter) {
  debug(`filter: ${filter}`);
  localStorage.setItem('filter', filter);
  gFilter = filter;
  filterPlayers();
  resetTeams();
  render();
}

function filterPlayers() {
  for (const [i, player] of gPlayers.entries()) {
    if (gFilter == 'filterAll') {
      player.checked = true;
    } else if (gFilter == 'filterQualified') {
      player.checked = player.games >= NUMBER_OF_GAMES_TO_QUALIFY;
    } else if (gFilter == 'filterRegulars') {
      player.checked = i < 10;
    } else if (gFilter == 'filterSubstitutes') {
      player.checked = i >= 10;
    }
  }
}

function togglePlayer(i, checked) {
  debug(`name: ${name}, checked: ${checked}`);
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
  var url = `https://sheets.googleapis.com/v4/spreadsheets/1ttG0bK-tLzMPgohBYvAR7Xx9sTXLpSmnagyNxzOcvjQ/values/${sheetName}!A1:J100?majorDimension=ROWS&key=AIzaSyCLvFHhl5l1iNKv2PaJM7n8eSftTCX8OTE`;
  $.get(url, processData);
}

function processData(data) {
  gPlayers = [];
  for (const row of data.values) {
    if (row[1] === '0' || row[1] > 0) {
      gPlayers.push({
        'name': row[0],
        'games': Number(row[1]),
        'p1': row[1] == 0 ? 1 : Number(row[6].replace(',', '.')), // priemerne zapasove body
        'p2': row[1] == 0 ? 1 : Number(row[9].replace(',', '.')), // priemerne kanadske body
        'checked': true,
        'textColor': row[1] > 0 ? 'black' : 'grey',
        'markerColor': gPlayers.length < 10 ? 'red' : 'blue',
        'markerLineColor': gPlayers.length < 10 ? 'red' : 'blue',
        'markerSize': Number(row[1]) / 2 + 5,
      })
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

var p1sum = players => players.reduce((p, n) => p + n.p1, 0);
var p2sum = players => players.reduce((p, n) => p + n.p2, 0);

async function createOptimalTeams() {
  document.getElementById('teamsDiv').style.display = 'none';
  var players = checkedPlayers();
  if (players.length != 10) return;
  var numberOfSubs = players => players.reduce((p, n) => p + (n.markerLineColor == 'red' ? 0 : 1), 0);
  var p1total = p1sum(players);
  var p2total = p2sum(players);
  var subsTotal = numberOfSubs(players);
  var p1best = 1000;
  var p2best = 1000;
  var p3best = 1000;
  var team1;
  for (const team of combinationN(players, 5)) {
    var p1diff = p1total - 2*p1sum(team);
    var p2diff = p2total - 2*p2sum(team);
    var p1 = Math.abs(p1diff);
    var p2 = Math.abs(p2diff);
    var p3 = p1 + p2 + Math.abs(p1diff + p2diff);
    var subsDiff = Math.abs(subsTotal - 2*numberOfSubs(team));
    var isBetter;
    if (gPriority == 'priority1') {
      isBetter = (p1 < p1best || (p1 == p1best && p2 < p2best));
    } else if (gPriority == 'priority2') {
      isBetter = (p2 < p2best || (p2 == p2best && p1 < p1best));
    } else if (gPriority == 'priority3') {
      isBetter = (p3 < p3best || (p3 == p3best && p1 < p1best));
    }
    if (gEvenSubstitutes) isBetter &&= subsDiff <= 1;
    if (isBetter) {
      team1 = team;
      p1best = p1;
      p2best = p2;
      p3best = p3;
      for (const p of players) {
        p.markerColor = 'black';
      }
      for (const p of team) {
        p.markerColor = 'white';
      }
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
    <tr><td colspan="2">zapasove body</td></tr>
    <tr><td>${p1sum(team1).toFixed(2)}</td><td>${p1sum(team2).toFixed(2)}</td></tr>
    <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr><td colspan="2">kanadske body</td></tr>
    <tr><td>${p2sum(team1).toFixed(2)}</td><td>${p2sum(team2).toFixed(2)}</td></tr>
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
    x: checkedPlayers().map(x => x.games == 0 && !showTeams ? NaN : x.p1),
    y: checkedPlayers().map(x => x.games == 0 && !showTeams ? NaN : x.p2),
    text: checkedPlayers().map(x => x.name),
    textfont: {
      color: checkedPlayers().map(x => x.textColor),
    },
    textposition: 'center right',
    cliponaxis: false,
    marker: {
      size: checkedPlayers().map(x => x.markerSize),
      color: checkedPlayers().map(x => x.markerColor),
      opacity: 0.9,
      line: {
        color: checkedPlayers().map(x => x.markerLineColor),
        width: 1,
      },
    },
    mode: "markers+text",
  }];
  if (showTeams) {
    data.unshift(generateWeb(players, 'black'));
    data.unshift(generateWeb(players, 'white'));
  }
  Plotly.react("myPlot", data, generateLayout(gAutoRange));
}

function generateLayout(autorange) {
  return {
    xaxis: {autorange: autorange, range: [0, 2], title: "priemerne zapasove body"},
    yaxis: {autorange: autorange, range: [0, 4], title: "priemerne kanadske body"},
    font: {size: 20},
    paper_bgcolor: "lightgrey",
    plot_bgcolor: "lightgrey",
    showlegend: false,
  };
}

function generateWeb(players, color) {
  var team = players.filter(x => x.markerColor == color);
  // asserting team.length == 5
  var x = p1sum(team) / 5;
  var y = p2sum(team) / 5;
  return {
    mode: 'lines+markers',
    line: {color: color, width: 2},
    marker: {size: [10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10], symbol: 'square', line: {width: 0}},
    x: [x, team[0].p1, x, team[1].p1, x, team[2].p1, x, team[3].p1, x, team[4].p1, x],
    y: [y, team[0].p2, y, team[1].p2, y, team[2].p2, y, team[3].p2, y, team[4].p2, y],
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
  gEvenSubstitutes = true;
  var storedValue = localStorage.getItem(`evenSubstitutes`);
  if (storedValue !== null) {
    gEvenSubstitutes = storedValue === 'true';
    document.getElementById('evenSubstitutes').checked = gEvenSubstitutes;
  }
  gPriority = 'priority3';
  var storedValue = localStorage.getItem(`priority`);
  if (storedValue !== null) {
    gPriority = storedValue;
    document.getElementById(gPriority).checked = true;
  }
  gFilter = 'filterRegulars';
  var storedValue = localStorage.getItem(`filter`);
  if (storedValue !== null) {
    gFilter = storedValue;
    document.getElementById(gFilter).checked = true;
  }
  gAutoRange = false;
  var storedValue = localStorage.getItem(`autoRange`);
  if (storedValue !== null) {
    gAutoRange = storedValue === 'true';
  }
  Plotly.newPlot("myPlot", [], generateLayout(false));
  document.getElementById('myPlot').on('plotly_doubleclick', (e) => {
    gAutoRange = !gAutoRange;
    localStorage.setItem('autoRange', gAutoRange);
  });
  displayGraph('2023');
});
