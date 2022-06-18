import { TextureLoader } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

export class MediaDeviceError extends Error {
  constructor(e) {
    super(e.message);
    this.error = e;
  }
}

const loadARToolKit = async (cameraParamURL) => {
  let cameraParam;
  await new Promise((resolve) => {
    window.addEventListener('artoolkit-loaded', resolve);
  });
  await new Promise((resolve, reject) => {
    cameraParam = new ARCameraParam();
    cameraParam.onload = resolve;
    cameraParam.onerror = reject;
    cameraParam.load(cameraParamURL);
  });
  return cameraParam;
};

const getDeviceStream = async () => {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'environment'
      }
    });
  } catch (e) {
    throw new MediaDeviceError(e);
  }
  return stream;
};

const loadCameraVideo = async (videoId) => {
  const { 0: stream } = await Promise.all([
    getDeviceStream(),
    new Promise((resolve) => {
      window.addEventListener('DOMContentLoaded', resolve);
    })
  ]);
  const video = document.getElementById(videoId);
  video.srcObject = stream;
  await new Promise((resolve) => {
    video.addEventListener('loadedmetadata', resolve);
  });
};

const loadWallVideo = async (wallVideoSrc) => {
  const player = new OGVPlayer();
  player.src = wallVideoSrc;
  player.muted = true;
  player.preload = true;
  await new Promise((resolve) => {
    player.addEventListener('loadedmetadata', resolve);
  });
  return player;
};

export const initiate = async ({
  cameraVideoId,
  cameraParamURL,
  roboModelSrc,
  roboTextureSrc,
  wallVideoSrc
}) => {
  const roboModelLoader = new FBXLoader();
  const roboTextureLoader = new TextureLoader();
  const {
    1: cameraParam,
    2: roboObject,
    3: roboTexture,
    5: wallVideoPlayer
  } = await Promise.all([
    Ammo(),
    loadARToolKit(cameraParamURL),
    roboModelLoader.loadAsync(roboModelSrc),
    roboTextureLoader.loadAsync(roboTextureSrc),
    loadCameraVideo(cameraVideoId),
    loadWallVideo(wallVideoSrc)
  ]);
  return {
    cameraParam,
    roboObject,
    roboTexture,
    wallVideoPlayer
  };
};
