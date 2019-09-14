var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const request = require('request');
var fs = require("fs");

const locationsFilePath = "/home/pi/braccioWebControl/saved/locations.json";

if(!fs.existsSync(locationsFilePath)) {
    console.log("Creating file: " + locationsFilePath);
    fs.writeFileSync(locationsFilePath, "{}");
}


/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} max The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

var port = undefined;
const parser = new Readline();
var connection = false;

var robot_response = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0
};

parser.on('data', line => {
    let res_array = line.split(" ");
    robot_response[0] = res_array[0];
    robot_response[1] = res_array[1];
    robot_response[2] = res_array[2];
    robot_response[3] = res_array[3];
    robot_response[4] = res_array[4];
});

SerialPort.list(function(err, ports) {
    port = new SerialPort(ports[0].comName, { baudRate: 9600 });
    port.pipe(parser);
    connection = true;
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', function (req, res) {
    res.render(path.join(__dirname + '/index.html'));
});

app.listen(4000, function () {
    console.log('app listening on port 4000...');
});

function commandDist(command, response) {
    let dist = [];
    for(let i = 0; i < command.length; i++)
        dist.push(Math.abs(command[i]-response[i]));
    return dist;
}

function areAllNear(array, value, epsilon) {
    for (let i = 0; i < array.length; i++)
        if (Math.abs(array[i] - value) > epsilon)
            return false;
    return true;
}

var commandLimits = [[0, 180], [15, 165], [0, 180], [0, 180], [0, 180]];

var sendCommands = function(commands) {
    for (let i = 0; i < commands.length; i++)
        commands[i] = commands[i].clamp(commandLimits[i][0], commandLimits[i][1]);
    port.write(commands[0] + ' ' + commands[1] +  ' ' + commands[2] + ' ' + commands[3] + ' ' + commands[4] + ' ');
    return new Promise(function(resolve, reject) {
        let waiting = setInterval(function() {
            if(areAllNear(commandDist(commands, robot_response), 0, 0.1)) {
                clearInterval(waiting);
                resolve();
            }
        }, 1);
    });
}

app.post('/updateBones', function (req, res) {

    if(!connection)
    {
        res.send(JSON.stringify(robot_response));
        return;
    }

    if(req.body == undefined || req.body == null || Object.keys(req.body).length != 5)
    {
        res.send(JSON.stringify(robot_response));
        return;
    }

    if(req.body[0] != robot_response[0] ||
       req.body[1] != robot_response[1] ||
       req.body[2] != robot_response[2] ||
       req.body[3] != robot_response[3] ||
       req.body[4] != robot_response[4])
    {
        let commands = [];
        for(let i = 0; i < 5; i++)
            commands.push(Math.round(req.body[i]));
        sendCommands(commands).then(function() {
            res.send(JSON.stringify(robot_response));
        });
    } else {
        res.send(JSON.stringify(robot_response));
    }

});

app.get('/cameraImage', function(req, res){
    var username = 'admin';
    var password = '';
    var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
    var requestSettings = {
        url: "http://192.168.1.10:8080/dms",
        method: 'GET',
        encoding: null,
        headers: {
            "Authorization" : auth
        }
    }

    request(requestSettings, function(err, res_img, body){
        res.set('Content-Type', 'image/jpeg');
        res.send(body);
    });
});

function writeLocationsFile(content) {
    fs.writeFileSync(locationsFilePath, content);
}

function readLocationsFile() {
    return fs.readFileSync(locationsFilePath);
}

function saveLocations(locations) {
    writeLocationsFile(JSON.stringify(locations));
}

function readLocations() {
    return JSON.parse(readLocationsFile());
}

function addLocation(name, location) {
    let locations = readLocations();
    locations[name] = location;
    saveLocations(locations);
}

function removeLocation(name) {
    let locations = readLocations();
    delete locations[name];
    saveLocations(locations);
}

app.post('/savedLocations', function(req, res) {
    addLocation(req.body['name'], req.body['rotations']);
    res.send(JSON.stringify(readLocations()));
});

app.get('/savedLocations', function(req, res) {
    res.send(JSON.stringify(readLocations()));
});

app.delete('/savedLocations', function(req, res) {
    removeLocation(req.body['name']);
    res.send(JSON.stringify(readLocations()));
});
