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
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
ctx.save();

function displayGraph(season, prefix = "") {
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
        // ctx.fillText('window: ' + window.innerWidth + ' x ' + window.innerHeight, 10, 20);
        // ctx.fillText('screen: ' + window.screen.width + ' x ' + window.screen.height, 10, 30);
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
            ctx.fillText(x[0], x[1], x[2]);
        }
    }
  );
}

displayGraph("2021");
