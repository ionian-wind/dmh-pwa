import * as THREE from 'three';

export interface DiceMaterialSet {
  standard: THREE.Material;
  extras: THREE.Material;
  dispose(): void;
}

const DEFAULT_COLOR = 0xf6f1e7;

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
): Promise<THREE.Texture> {
  const texture = await loader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * The shipped dice atlases contain numbers/pips on a transparent or flat
 * background. Using them as `map` directly would make the die body
 * transparent or dark, so blend the atlas colour over the base die colour
 * using the atlas alpha while keeping the material opaque.
 */
function createAtlasMaterial(
  texture: THREE.Texture | undefined,
  normalTexture: THREE.Texture | undefined,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: DEFAULT_COLOR,
    map: texture ?? null,
    normalMap: normalTexture ?? null,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.5,
    metalness: 0.05,
  });
  if (texture) {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        [
          'vec3 diceBaseColor = diffuseColor.rgb;',
          '#include <map_fragment>',
          'diffuseColor.rgb = mix(diceBaseColor, sampledDiffuseColor.rgb, sampledDiffuseColor.a);',
          'diffuseColor.a = 1.0;',
        ].join('\n'),
      );
    };
    material.customProgramCacheKey = () => 'dice-atlas-overlay';
  }
  return material;
}

export async function loadDiceMaterials(
  assetPath: string,
  theme = 'default-extras',
): Promise<DiceMaterialSet> {
  const loader = new THREE.TextureLoader();
  const themeRoot = joinUrl(assetPath, `themes/${theme}`);
  const baseRoot = joinUrl(assetPath, 'themes/default');
  const [dark, extras, normal, normalExtras] = await Promise.all([
    loadTexture(loader, joinUrl(baseRoot, 'diffuse-dark.png')).catch(
      () => undefined,
    ),
    loadTexture(loader, joinUrl(themeRoot, 'diffuse-extras.png')).catch(
      () => undefined,
    ),
    loadTexture(loader, joinUrl(baseRoot, 'normal.png')).catch(() => undefined),
    loadTexture(loader, joinUrl(themeRoot, 'normal-extras.png')).catch(
      () => undefined,
    ),
  ]);

  const standard = createAtlasMaterial(dark, normal);
  const extraMaterial = createAtlasMaterial(
    extras ?? dark,
    normalExtras ?? normal,
  );

  return {
    standard,
    extras: extraMaterial,
    dispose() {
      dark?.dispose();
      extras?.dispose();
      normal?.dispose();
      normalExtras?.dispose();
      standard.dispose();
      extraMaterial.dispose();
    },
  };
}
