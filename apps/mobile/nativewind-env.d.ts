/// <reference types="nativewind/types" />

/**
 * `import './global.css'` no importa un valor: Metro lo usa como senal para
 * procesar las clases de Tailwind. Sin esta declaracion, TypeScript no sabe
 * que es un modulo valido y marca el import como error.
 *
 * Va aca y no en el `expo-env.d.ts` que genera Expo porque ese archivo esta en
 * .gitignore: se regenera en cada maquina, asi que no es un lugar donde poner
 * algo que el proyecto necesita.
 */
declare module '*.css';
