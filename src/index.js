import {
  AnimationMixer,
  CanvasTexture,
  Clock,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

import { initiate, MediaDeviceError } from '@/initiator';
import {
  AnimationIntervalPlayer,
  createPhysics,
  createRigidBody,
  createRope,
  createRopeSoftBody,
  transformRigidBodyThreeObject,
  transformRopeThreeObject
} from '@/helpers';

import cameraParamURL from '@/assets/data/camera_para.dat';
import markerURL from '@/assets/targets/hiro.patt';
import roboModelSrc from '@/assets/models/Robo_01.fbx';
import roboTextureSrc from '@/assets/textures/Robot_01_Diffuse.png';
import wallVideoSrc from '@/assets/videos/black-explosion-firework-star.webm';

const MARGIN = 0.005;
const BALL_Z_OFFSET = 1;
const ROPE_MASS = 3;
const ROPE_LENGTH = 4;
const ROPE_NUM_SEGMENTS = 10;
const BALL_MASS = 1.2;
const BALL_RADIUS = 0.2;

(async () => {
  let initResults;
  try {
    initResults = await initiate({
      cameraVideoId: 'video',
      cameraParamURL,
      roboModelSrc,
      roboTextureSrc,
      wallVideoSrc
    });
  } catch (e) {
    if (e instanceof MediaDeviceError) {
      alert('Error accessing media devices.');
    } else {
      alert('Unable to fetch resources.');
    }
    return;
  }
  const {
    cameraParam,
    roboObject,
    roboTexture,
    wallVideoPlayer
  } = initResults;

  const bodyChestTrackTimes = roboObject.animations[0].tracks[3].times;
  const roboIdleInterval = {
    startTime: bodyChestTrackTimes[38],
    endTime: bodyChestTrackTimes[42]
  };
  const roboFlyInterval = {
    startTime: bodyChestTrackTimes[8],
    endTime: bodyChestTrackTimes[10]
  };

  const container = document.getElementById('container');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const spinner = document.getElementById('spinner');
  let detected;
  let canStartWallVideo;

  spinner.remove();
  video.play();

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });

  const scene = new Scene();

  const camera = new PerspectiveCamera();
  scene.add(camera);

  const markerRoot = new Group();
  markerRoot.matrixAutoUpdate = false;
  scene.add(markerRoot);

  const physicsWorld = createPhysics();

  const wallTexture = new CanvasTexture(wallVideoPlayer.firstChild);
  wallTexture.center.set(0.5, 0.5);
  if (wallVideoPlayer.videoWidth >= wallVideoPlayer.videoHeight) {
    wallTexture.repeat.x = wallVideoPlayer.videoHeight / wallVideoPlayer.videoWidth;
  } else {
    wallTexture.repeat.y = wallVideoPlayer.videoWidth / wallVideoPlayer.videoHeight;
  }
  const wall = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      map: wallTexture,
      side: FrontSide
    })
  );
  const resetWallTexture = () => {
    wall.material.colorWrite = false;
    wallVideoPlayer.currentTime = 0;
    canStartWallVideo = true;
  };
  resetWallTexture();
  wallVideoPlayer.addEventListener('ended', resetWallTexture);
  markerRoot.add(wall);
  const wallBody = createRigidBody({
    shape: new Ammo.btBoxShape(new Ammo.btVector3(0.5, 0.5, 0.025)),
    margin: MARGIN,
    mass: 0,
    position: new Ammo.btVector3(0, 0, 0),
    quaternion: new Ammo.btQuaternion(0, 0, 0, 1)
  });
  physicsWorld.addRigidBody(wallBody);

  const ballGroup = new Group();
  markerRoot.add(ballGroup);

  const pmremGenerator = new PMREMGenerator(renderer);
  const ballTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  const ball = new Mesh(
    new SphereGeometry(BALL_RADIUS, 64, 32),
    new MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      ior: 1.5,
      envMap: ballTexture,
      envMapIntensity: 1,
      transmission: 1,
      specularIntensity: 1,
      specularColor: 0xffffff,
      opacity: 1,
      side: DoubleSide,
      transparent: true
    })
  );
  ballGroup.add(ball);
  const ballBody = createRigidBody({
    shape: new Ammo.btSphereShape(BALL_RADIUS),
    margin: MARGIN,
    mass: BALL_MASS,
    position: new Ammo.btVector3(0, 0, BALL_Z_OFFSET),
    quaternion: new Ammo.btQuaternion(0, 0, 0, 1)
  });
  physicsWorld.addRigidBody(ballBody);

  roboObject.children[0].material = new MeshBasicMaterial({ map: roboTexture });
  roboObject.position.y = -0.11;
  roboObject.scale.set(0.06, 0.06, 0.06);
  ballGroup.add(roboObject);
  const roboMixer = new AnimationMixer(roboObject);
  const roboAction = roboMixer.clipAction(roboObject.animations[0]);
  roboAction.play();
  const roboAnimationPlayer = new AnimationIntervalPlayer(roboMixer);
  roboAnimationPlayer.addInterval('idle', roboIdleInterval.startTime, roboIdleInterval.endTime);
  roboAnimationPlayer.addInterval('fly', roboFlyInterval.startTime, roboFlyInterval.endTime);

  const rope = createRope({
    color: 0xffff00,
    numSegments: ROPE_NUM_SEGMENTS
  });
  markerRoot.add(rope);
  const ropeSoftBody = createRopeSoftBody({
    worldInfo: physicsWorld.getWorldInfo(),
    start: new Ammo.btVector3(0, BALL_RADIUS, BALL_Z_OFFSET),
    end: new Ammo.btVector3(0, BALL_RADIUS + ROPE_LENGTH, BALL_Z_OFFSET),
    numSegments: ROPE_NUM_SEGMENTS,
    fixeds: 0b10,
    margin: MARGIN * 3,
    mass: ROPE_MASS
  });
  physicsWorld.addSoftBody(ropeSoftBody);
  ropeSoftBody.appendAnchor(0, ballBody, true, 1);

  const handleContact = () => {
    if (canStartWallVideo) {
      wall.material.colorWrite = true;
      wallVideoPlayer.play();
      canStartWallVideo = false;
    }
  };
  const cbContactPairResult = new Ammo.ConcreteContactResultCallback();
  cbContactPairResult.addSingleResult = (cp) => {
    const contactPoint = Ammo.wrapPointer(cp, Ammo.btManifoldPoint);
    const distance = contactPoint.getDistance();
    if (distance <= 0) {
      handleContact();
    }
  };

  const arController = new ARController(video.videoWidth, video.videoHeight, cameraParam);
  const cameraMat = arController.getCameraMatrix();

  arController.loadMarker(markerURL, (markerId) => {
    arController.addEventListener('getMarker', (ev) => {
      if (ev.data.marker.id === markerId) {
        detected = true;
        // Buggy detection results are yielded when video.videoWidth < video.videoHeight.
        // Work around it by setting arController.orientation to 'portrait' and rotating the canvas.
        arController.arglCameraViewRHf(ev.data.matrix, markerRoot.matrix.elements);
      }
    });
  });

  const handleResize = () => {
    let vw;
    let vh;
    const videoRatio = video.videoWidth / video.videoHeight;
    arController.orientation = videoRatio >= 1 ? 'landscape' : 'portrait';
    const containerRatio = container.clientWidth / container.clientHeight;
    if (videoRatio > containerRatio) {
      vh = container.clientHeight;
      vw = vh * videoRatio;
    } else {
      vw = container.clientWidth;
      vh = vw / videoRatio;
    }
    video.style.width = `${vw}px`;
    video.style.height = `${vh}px`;
    const pixelRatio = window.devicePixelRatio;
    if (videoRatio >= 1) {
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      canvas.style.transform = 'translate(-50%, -50%)';
      renderer.setSize(
        container.clientWidth * pixelRatio,
        container.clientHeight * pixelRatio,
        false
      );
    } else {
      canvas.style.width = `${container.clientHeight}px`;
      canvas.style.height = `${container.clientWidth}px`;
      canvas.style.transform = 'translate(-50%, -50%) rotate(-90deg)';
      renderer.setSize(
        container.clientHeight * pixelRatio,
        container.clientWidth * pixelRatio,
        false
      );
    }

    const visibleHeightRatio = videoRatio >= 1
      ? container.clientHeight / vh
      : container.clientWidth / vw;
    const fov = 2 * Math.atan((1 / cameraMat[5]) * visibleHeightRatio) * (180 / Math.PI);
    const near = cameraMat[14] / (cameraMat[10] - 1.0);
    const far = cameraMat[14] / (cameraMat[10] + 1.0);
    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.aspect = videoRatio >= 1
      ? container.clientWidth / container.clientHeight
      : container.clientHeight / container.clientWidth;
    camera.updateProjectionMatrix();
  };
  handleResize();
  window.addEventListener('resize', handleResize);
  video.addEventListener('resize', handleResize);

  const pointerCoords = new Vector2();
  const raycaster = new Raycaster();
  canvas.addEventListener('pointerdown', (event) => {
    if (video.videoWidth >= video.videoHeight) {
      pointerCoords.set(
        (event.clientX / event.target.clientWidth) * 2 - 1,
        -(event.clientY / event.target.clientHeight) * 2 + 1
      );
    } else {
      pointerCoords.set(
        -(event.clientY / event.target.clientWidth) * 2 + 1,
        -(event.clientX / event.target.clientHeight) * 2 + 1
      );
    }
    raycaster.setFromCamera(pointerCoords, camera);
    const intersection = raycaster.intersectObject(ball);
    if (intersection.length) {
      const velocity = ballBody.getLinearVelocity();
      const newVelocity = new Ammo.btVector3(velocity.x(), velocity.y(), velocity.z());
      const cameraPosition = camera.position.clone();
      markerRoot.worldToLocal(cameraPosition);
      const direction = ball.position.clone().sub(cameraPosition).normalize();
      const imposedVelocity = new Ammo.btVector3(direction.x, direction.y, direction.z);
      imposedVelocity.op_mul(8);
      newVelocity.op_add(imposedVelocity);
      ballBody.setLinearVelocity(newVelocity);
    }
  });

  const clock = new Clock();
  const render = () => {
    requestAnimationFrame(render);

    detected = false;
    arController.process(video);
    markerRoot.visible = detected;

    const delta = clock.getDelta();

    physicsWorld.stepSimulation(delta, 10);

    physicsWorld.contactPairTest(ballBody, wallBody, cbContactPairResult);

    if (markerRoot.visible) {
      transformRigidBodyThreeObject({ rigidBody: wallBody, object3d: wall });
      transformRigidBodyThreeObject({ rigidBody: ballBody, object3d: ballGroup });
      transformRopeThreeObject({ softBody: ropeSoftBody, object3d: rope });

      const velocity = ballBody.getLinearVelocity();
      if (velocity.length() < 0.2) {
        roboAnimationPlayer.startOrUpdate('idle', delta);
      } else {
        roboAnimationPlayer.startOrUpdate('fly', delta);
      }

      wallTexture.needsUpdate = true;
    }

    renderer.render(scene, camera);
  };
  requestAnimationFrame(render);
})();
