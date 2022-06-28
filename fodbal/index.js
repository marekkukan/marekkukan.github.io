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
  var url = `https://sheets.googleapis.com/v4/spreadsheets/1ttG0bK-tLzMPgohBYvAR7Xx9sTXLpSmnagyNxzOcvjQ/values/${sheetName}!A1:J100?majorDimension=COLUMNS&key=AIzaSyCLvFHhl5l1iNKv2PaJM7n8eSftTCX8OTE`;
  gNumberOfGamesToQualify = 6;
  $.get(url, (data) => {gData = data; drawGraph(data);});
}

function drawGraph(data) {
  var data = [{
    x: data.values[6].filter((x, i) => data.values[1][i] >= gNumberOfGamesToQualify).map(x => x.replace(',', '.')),
    y: data.values[9].filter((x, i) => data.values[1][i] >= gNumberOfGamesToQualify).map(x => x.replace(',', '.')),
    text: data.values[0].filter((x, i) => data.values[1][i] >= gNumberOfGamesToQualify),
    textposition: 'center right',
    marker: {size: 20},
    mode: "markers+text",
  }];
  var layout = {
    xaxis: {range: [0, 2], title: "priemerne body"},
    yaxis: {range: [0, 4], title: "priemerne kanadske body"},
    font: {size: 20},
  };
  Plotly.newPlot("myPlot", data, layout);
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

window.addEventListener('load', (e) => {
  displayGraph('2022');
  debug(`system: ${navigator.userAgent}`);
  debug(`screen: ${window.screen.width}x${window.screen.height}`);
  debug(`window: ${window.innerWidth}x${window.innerHeight}`);
  debug(`localStorage available: ${storageAvailable('localStorage')}`);
  debug(`sessionStorage available: ${storageAvailable('sessionStorage')}`);
});
