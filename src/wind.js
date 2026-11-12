// Wind as a vertex-shader offset that grows with height, applied to bark, leaves and fruit
// alike so branches and the leaves on them move together. Shadow passes don't sway.
export const windUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 },
};

const SWAY_START = 55; // m: everything below this stays still (trunk, walkways)

export function addWind(material, { flutter = false, silverBack = false } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWind = windUniforms.uWind;
    shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      float hh = max( mvPosition.y - ${SWAY_START.toFixed(1)}, 0.0 );
      float sway = hh * hh * 0.00035 * uWind;
      mvPosition.x += sway * ( sin( uTime * 0.8 + mvPosition.z * 0.015 ) + 0.35 * sin( uTime * 2.1 + mvPosition.y * 0.04 ) );
      mvPosition.z += sway * 0.5 * sin( uTime * 0.63 + mvPosition.x * 0.02 );
      ${flutter ? 'mvPosition.xyz += uWind * 0.07 * vec3( sin( uTime * 5.0 + mvPosition.x * 0.9 + mvPosition.y ), cos( uTime * 4.3 + mvPosition.z * 0.8 ), sin( uTime * 4.7 + mvPosition.y * 0.6 ) );' : ''}
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
    if (silverBack) {
      // Olive leaves are dark green on top and silvery grey-green underneath.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nif ( ! gl_FrontFacing ) diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.36, 0.38, 0.30 ), 0.7 );'
      );
    }
  };
  material.customProgramCacheKey = () => `wind-${flutter}-${silverBack}`;
  return material;
}
