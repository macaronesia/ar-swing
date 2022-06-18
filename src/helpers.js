import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments
} from 'three';

export class AnimationIntervalPlayer {
  constructor(mixer) {
    this.mixer = mixer;
    this.intervals = {};
    this.currentName = null;
  }

  addInterval(name, startTime, endTime) {
    this.intervals[name] = { startTime, endTime };
  }

  update(delta) {
    const { startTime, endTime } = this.intervals[this.currentName];
    this.mixer.setTime(((this.mixer.time + delta - startTime) % (endTime - startTime)) + startTime);
  }

  startOrUpdate(name, delta) {
    if (name === this.currentName) {
      this.update(delta);
    } else {
      this.currentName = name;
      this.mixer.setTime(this.intervals[this.currentName].startTime);
    }
  }
}

export const createPhysics = () => {
  const GRAVITY_CONSTANT = -9.8;
  const collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  const softBodySolver = new Ammo.btDefaultSoftBodySolver();
  const physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
    softBodySolver
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, GRAVITY_CONSTANT, 0));
  physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, GRAVITY_CONSTANT, 0));
  return physicsWorld;
};

export const createRigidBody = ({
  shape,
  margin,
  mass,
  position,
  quaternion
}) => {
  shape.setMargin(margin);
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(position);
  transform.setRotation(quaternion);
  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0);
  shape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);
  if (mass > 0) {
    body.setActivationState(4);
  }
  return body;
};

export const transformRigidBodyThreeObject = ({ rigidBody, object3d }) => {
  const transform = new Ammo.btTransform();
  const motionState = rigidBody.getMotionState();
  motionState.getWorldTransform(transform);
  const p = transform.getOrigin();
  const q = transform.getRotation();
  object3d.position.set(p.x(), p.y(), p.z());
  object3d.quaternion.set(q.x(), q.y(), q.z(), q.w());
};

export const createRope = ({ color, numSegments }) => {
  const geometry = new BufferGeometry();
  const material = new LineBasicMaterial({ color });

  const ropeIndices = [];
  for (let i = 0; i < numSegments; i += 1) {
    ropeIndices.push(i, i + 1);
  }
  geometry.setIndex(new BufferAttribute(new Uint16Array(ropeIndices), 1));
  geometry.setAttribute('position', new BufferAttribute(new Float32Array((numSegments + 1) * 3), 3));
  geometry.computeBoundingSphere();

  return new LineSegments(geometry, material);
};

export const createRopeSoftBody = ({
  worldInfo,
  start,
  end,
  numSegments,
  fixeds,
  margin,
  mass
}) => {
  const softBodyHelpers = new Ammo.btSoftBodyHelpers();
  const softBody = softBodyHelpers.CreateRope(worldInfo, start, end, numSegments - 1, fixeds);
  const sbConfig = softBody.get_m_cfg();
  sbConfig.set_viterations(10);
  sbConfig.set_piterations(10);
  softBody.setTotalMass(mass, false);
  Ammo.castObject(softBody, Ammo.btCollisionObject).getCollisionShape().setMargin(margin);
  softBody.setActivationState(4);

  return softBody;
};

export const transformRopeThreeObject = ({ softBody, object3d }) => {
  const positions = object3d.geometry.attributes.position.array;
  const numVerts = positions.length / 3;
  const nodes = softBody.get_m_nodes();
  for (let i = 0, indexFloat = 0; i < numVerts; i += 1, indexFloat += 3) {
    const node = nodes.at(i);
    const nodePos = node.get_m_x();
    positions[indexFloat] = nodePos.x();
    positions[indexFloat + 1] = nodePos.y();
    positions[indexFloat + 2] = nodePos.z();
  }
  object3d.geometry.attributes.position.needsUpdate = true;
};
