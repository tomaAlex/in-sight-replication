var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
scene.background = new THREE.Color( 0xc0c0c0 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );

var light = new THREE.AmbientLight( 0xffffff, 0.1 ); // soft white light
scene.add( light );

var spotLight = new THREE.SpotLight( 0xffffff );
spotLight.position.set( 100, 1000, 100 );

spotLight.castShadow = true;

spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;

spotLight.shadow.camera.near = 500;
spotLight.shadow.camera.far = 4000;
spotLight.shadow.camera.fov = 30;

scene.add( spotLight );

var material = new THREE.MeshBasicMaterial({color: 0xff0000});

function createBones( root , array ) {
    if(root === null && root === undefined ) {
        return;
    } else {
        let bone = new THREE.Bone();

        bone.position.set( root.position.x, root.position.y, root.position.z );
        bone.name = root.name;
        bone.setRotationFromQuaternion( root.quaternion );
        bone.scale.set( root.scale.x, root.scale.y, root.scale.z );
        if(root.parent !== null && root.parent !== undefined ) {
            bone.parent = root.parent;
        }
        array.push(bone);

        for(let i = 0, count = root.children.length; i < count; i++) {
            bone.add(createBones(root.children[i], array));
        }
        return bone;
    }
}

var bones = [];
var helper;
var braccio;

var transformControls = {};


var loader = new THREE.FBXLoader();
loader.load( 'braccio.fbx', function ( object ) {
    braccio = object.getObjectByName("Braccio")
    createBones(object.getObjectByName("Armature").getObjectByName("Base"), bones);
    scene.add( braccio );
    var skeleton = new THREE.Skeleton( bones );
    braccio.add(bones[0]);
    braccio.bind(skeleton);
    bones[0].allowedAxis = {"Y": true};
    bones[0].rotMin = degToRad(0);
    bones[0].rotMax = degToRad(180);
    bones[0].rotOffset = 90;
    bones[1].allowedAxis = {"X": true};
    bones[1].rotMin = degToRad(15);
    bones[1].rotMax = degToRad(165);
    bones[1].rotOffset = 90;
    bones[2].allowedAxis = {"X": true};
    bones[2].rotMin = degToRad(0);
    bones[2].rotMax = degToRad(180);
    bones[2].rotOffset = 90;
    bones[3].allowedAxis = {"X": true};
    bones[3].rotMin = degToRad(0);
    bones[3].rotMax = degToRad(180);
    bones[3].rotOffset = 90;
    bones[4].allowedAxis = {"Y": true};
    bones[4].rotMin = degToRad(0);
    bones[4].rotMax = degToRad(180);
    bones[4].rotOffset = 90;
    bones[5].allowedAxis = {};
    bones.forEach(joint => {
        transformControls[joint.name] = new TransformControls(camera, renderer.domElement);
        transformControls[joint.name].mode = "rotate";
        transformControls[joint.name].addEventListener("dragging-changed", event => {
            controls.enabled = !event.value;
        }, false);
        transformControls[joint.name].space = "local";
        transformControls[joint.name].snap = 1;
        transformControls[joint.name].attach(joint);    
        scene.add(transformControls[joint.name]);
    });
    resetRotations();
} );

camera.position.set(50, 70, 20);

controls.update();

var animate = function () {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
};

animate();

function degToRad(deg)
{
    return deg / 180 * Math.PI;
}
function radToDeg(rad)
{
    return rad / Math.PI * 180;
}

var last_rotations = {0: 90, 1: 90, 3: 90, 4: 90};

function getRotations() {
    return {
        0: 180 - (radToDeg(bones[0].rotation.y) + bones[0].rotOffset),
        1: radToDeg(bones[1].rotation.x) + bones[1].rotOffset,
        2: radToDeg(bones[2].rotation.x) + bones[2].rotOffset,
        3: radToDeg(bones[3].rotation.x) + bones[3].rotOffset,
        4: 180 - (radToDeg(bones[4].rotation.y) + bones[4].rotOffset)
    }
}

function setRotations(newRotations) {
    bones[0].rotation.y = degToRad((180 - newRotations[0] - bones[0].rotOffset));
    bones[1].rotation.x = degToRad(newRotations[1] - bones[1].rotOffset);
    bones[2].rotation.x = degToRad(newRotations[2] - bones[2].rotOffset);
    bones[3].rotation.x = degToRad(newRotations[3] - bones[3].rotOffset);
    bones[4].rotation.y = degToRad((180 - newRotations[4] - bones[4].rotOffset));
}

async function sendRotations(updateRotations = true) {
    let rotations_to_send = getRotations();

    if(rotations_to_send != last_rotations)
    {
        var xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/updateBones', false);
        xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhttp.send(JSON.stringify(rotations_to_send));
        var newRotations = JSON.parse(xhttp.responseText);
        if(updateRotations)
            setRotations(newRotations);
        last_rotations = newRotations;
    }
}

document.onmouseup = (() => { sendRotations(); });

function poseRPIShake()
{
    setRotations({0: 65, 1: 140, 2: 140, 3: 149, 4: 175});
    sendRotations();
}

var danceid = null;

var song = new Audio('danceSong.mp3');

song.addEventListener('ended', function() {
    song.currentTime = 0;
    song.play();
}, false);

async function dance()
{
    song.play();
    if(danceid)
        return;    
    danceid = setInterval(() => {
        if(!danceid)
            return;
        setRotations({0: 90, 1: 90, 2: 27.000000000000007, 3: 180, 4: 90});
        sendRotations();
        setTimeout(() => {
        if(!danceid)
            return;
        setRotations({0: 0, 1: 90, 2: 86, 3: 180, 4: 0});
        sendRotations();
        setTimeout(() => {
        if(!danceid)
            return;
        setRotations({0: 106, 1: 64, 2: 116, 3: 91, 4: 180});
        sendRotations();
        setTimeout(() => {
        if(!danceid)
            return;
        setRotations({0: 106, 1: 165, 2: 2, 3: 178, 4: 0});
        sendRotations();
        }, 1000);
        }, 1000);
        }, 1000);
    }, 3000);
}

function stopDance()
{
    clearInterval(danceid);
    danceid = null;
    song.loop = false;
    song.pause();
    song.currentTime = 0;
}

function resetRotations()
{
    setRotations({0: 90, 1: 90, 2: 90, 3: 90, 4: 90});
    sendRotations();
}
