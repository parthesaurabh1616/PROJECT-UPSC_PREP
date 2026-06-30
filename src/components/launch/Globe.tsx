"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/lib/geo";

const SUN = new THREE.Vector3(-1, 0.35, 0.8).normalize();
const TILT = 23.5 * (Math.PI / 180);

/* ── Earth surface shader: day map + night city-lights across a soft
   terminator, bluish sun-glint on oceans, fresnel atmospheric rim. ── */
const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;
const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specularMap;
  uniform vec3 sunDirection;
  uniform vec3 atmoColor;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(sunDirection);
    float sun = dot(N, L);
    float day = smoothstep(-0.15, 0.25, sun);

    vec3 dayCol = texture2D(dayMap, vUv).rgb;
    vec3 nightCol = texture2D(nightMap, vUv).rgb;
    float ocean = texture2D(specularMap, vUv).r;

    // sun glint on water (only where lit)
    float spec = pow(max(sun, 0.0), 18.0) * ocean * 0.7;

    // city lights only on the dark hemisphere
    vec3 night = nightCol * (1.0 - day) * 1.7;

    vec3 color = dayCol * (0.18 + 0.92 * day) + night;
    color += vec3(0.55, 0.72, 1.0) * spec;

    // fresnel rim, stronger on the lit limb
    float fres = pow(1.0 - max(dot(N, normalize(vViewDir)), 0.0), 3.0);
    color += atmoColor * fres * (0.30 + 0.55 * day);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ── Atmosphere halo: additive fresnel shell, sun-biased. ── */
const atmoVert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;
const atmoFrag = /* glsl */ `
  uniform vec3 glowColor;
  uniform vec3 sunDirection;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec3 N = normalize(vNormalW);
    float fres = pow(1.0 - abs(dot(N, normalize(vViewDir))), 2.6);
    float sun = smoothstep(-0.35, 0.45, dot(N, normalize(sunDirection)));
    vec3 col = glowColor * fres * (0.45 + 0.85 * sun);
    gl_FragColor = vec4(col, fres);
  }
`;

export default function Globe({ children }: { children?: ReactNode }) {
  const [dayMap, nightMap, cloudMap, specMap] = useTexture([
    "/textures/earth/earth_atmos_2048.jpg",
    "/textures/earth/earth_lights_2048.png",
    "/textures/earth/earth_clouds_1024.png",
    "/textures/earth/earth_specular_2048.jpg",
  ]);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    specMap.colorSpace = THREE.NoColorSpace;
    for (const t of [dayMap, nightMap, cloudMap, specMap]) {
      t.anisotropy = 8;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }
  }, [dayMap, nightMap, cloudMap, specMap]);

  const earthMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        uniforms: {
          dayMap: { value: dayMap },
          nightMap: { value: nightMap },
          specularMap: { value: specMap },
          sunDirection: { value: SUN },
          atmoColor: { value: new THREE.Color(0.30, 0.55, 1.0) },
        },
      }),
    [dayMap, nightMap, specMap]
  );

  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        uniforms: {
          glowColor: { value: new THREE.Color(0.25, 0.55, 1.0) },
          sunDirection: { value: SUN },
        },
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const spin = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.025;
    if (clouds.current) clouds.current.rotation.y += dt * 0.009;
  });

  return (
    <group rotation={[0, 0, TILT]}>
      {/* Earth + clouds spin together (clouds a touch faster via own ref) */}
      <group ref={spin}>
        <mesh material={earthMat}>
          <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        </mesh>
        <mesh ref={clouds} scale={1.006}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshBasicMaterial map={cloudMap} alphaMap={cloudMap} transparent opacity={0.42} depthWrite={false} blending={THREE.NormalBlending} />
        </mesh>
        {/* earth-anchored intelligence layers (nodes, arcs) ride the spin */}
        {children}
      </group>
      {/* Atmosphere halo — does not spin */}
      <mesh material={atmoMat} scale={1.025}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      </mesh>
    </group>
  );
}

export { SUN, TILT };
