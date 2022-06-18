# AR Swing

A tiny interactive AR scene buit with **ARToolKit.js**, **Three.js** and **ammo.js**.

Try out the [build](https://macaronesia.github.io/ar-swing/) on your mobile!

## Features

- Marker-based AR
- Animation clips played by Three.js
- Using animated canvas as texture
- Rigid and soft body physics
- Collision detection

## How to play

Open the page in a browser on a mobile phone or any other device with a camera, and then focus the camera on the following marker image. Hit the ball to any direction as you like!

![Hiro](src/assets/targets/hiro.jpg)

## Getting Started

1. **Install dependencies**

    ```bash
    $ yarn
    ```

2. **Start the dev server**

    ```bash
    $ yarn start
    ```

3. **Visit the page via HTTPS**

    Place the dev server behind a proxy server which can be accessed via HTTPS (MediaDevices.getUserMedia is available only in secure contexts).

## Attribution

- The animated 3D model "[Robo Welder](https://opengameart.org/content/robo-welder)" by [Bartheinz](https://opengameart.org/users/bartheinz) is licensed under [CC-BY 3.0](http://creativecommons.org/licenses/by/3.0/).
