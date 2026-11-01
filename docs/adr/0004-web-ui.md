# ADR 0004 — UI web vs móvil

- Estado: aceptado (Fase 0)

## Decisión

La web (Next.js) **no** reutiliza componentes React Native (sin react-native-web).
Se comparten `core`, `data`, `api-client` y los **tokens** de `ui` mediante un preset de Tailwind común. Los componentes se implementan por plataforma.

## Motivo

La web pública de estadísticas necesita SSR/ISR y SEO limpios, y la tabla de datos tiene patrones muy distintos en web y móvil. Meter RN-web en Next complica mucho el build. La paridad se consigue compartiendo lógica y diseño, no JSX.
