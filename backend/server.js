var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const request = require('request');

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

app.post('/updateBones', function (req, res) {

    if(!connection)
    {
        res.send(JSON.stringify(robot_response));
        return;
    }

    if(req.body[0] != robot_response[0] ||
        req.body[1] != robot_response[1] ||
        req.body[2] != robot_response[2] ||
        req.body[3] != robot_response[3] ||
        req.body[4] != robot_response[4]) 
        port.write(Math.round(req.body[0]) + " " + Math.round(req.body[1]) + " " + Math.round(req.body[2]) + " " + Math.round(req.body[3]) + " " + Math.round(req.body[4]) + " ");
    

    setTimeout(() => {
        res.send(JSON.stringify(robot_response));
    }, 500);

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
