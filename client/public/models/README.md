# Custom GLTF Character Model

## How to Add Your Custom GLTF Model

1. **Place your GLTF file** in this directory (`public/models/`)
2. **Name it `character.gltf`** or update the `modelPath` prop in `GLTFCharacter.jsx`
3. **Supported formats**: `.gltf`, `.glb`

## Model Requirements

- **Size**: Keep the model reasonably sized (around 1-2 units in Three.js space)
- **Orientation**: Model should face forward (positive X direction)
- **Materials**: The component will automatically apply shadows and lighting
- **Animation**: If your model has animations, they will be preserved

## Example GLTF Files

You can find free GLTF models from:
- [Sketchfab](https://sketchfab.com/features/free-3d-models)
- [Google Poly](https://poly.pizza/)
- [TurboSquid](https://www.turbosquid.com/Search/3D-Models/free/gltf)
- [Clara.io](https://clara.io/)

## Testing

1. Add your GLTF file to this directory
2. Restart the development server: `npm run dev`
3. The game will automatically load your custom character model

## Customization

You can modify the `GLTFCharacter.jsx` component to:
- Adjust the scale of the model
- Change the position or rotation
- Add custom materials or effects
- Modify the trail effects
