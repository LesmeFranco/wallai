const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const raizDelProyecto = __dirname;
const raizDelMonorepo = path.resolve(raizDelProyecto, '../..');

const config = getDefaultConfig(raizDelProyecto);

/**
 * Metro, por defecto, solo mira los archivos que estan dentro de apps/mobile.
 * En un monorepo eso no alcanza: los paquetes internos (@wallai/validators,
 * @wallai/api) se publican como TypeScript sin compilar, asi que Metro tiene
 * que poder leerlos y recargar la app cuando cambian.
 */
config.watchFolders = [raizDelMonorepo];

/**
 * Donde buscar las dependencias. Primero las propias de la app, despues las de
 * la raiz del monorepo, porque pnpm con `node-linker=hoisted` (ver .npmrc)
 * deja la mayoria arriba.
 */
config.resolver.nodeModulesPaths = [
  path.resolve(raizDelProyecto, 'node_modules'),
  path.resolve(raizDelMonorepo, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
