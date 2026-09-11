/**
 * El plugin de Babel de Reanimated NO se declara aca a proposito.
 *
 * `babel-preset-expo` (SDK 57) detecta si `react-native-worklets` esta
 * instalado y agrega su plugin solo. Declararlo tambien aca lo duplicaria, y
 * Babel falla con un error de plugin repetido.
 *
 * `jsxImportSource: 'nativewind'` es lo que hace que la prop `className`
 * funcione en los componentes de React Native.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
