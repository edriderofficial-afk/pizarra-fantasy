# ADR 0007 — Uso personal, sin monetización

- Estado: aceptado. Sustituye a las partes del brief sobre monetización y lanzamiento (§6 y Fase 5).

## Contexto

El responsable del proyecto usará Pizarra solo para uso personal: no se venderá, no tendrá Premium ni
anuncios y no se publicará en tiendas.

## Decisión

- Fuera de alcance: RevenueCat, AdMob/UMP, paywall, analítica de producto, páginas legales públicas,
  fichas de tienda, EAS Submit y web pública de estadísticas con SEO.
- Instalación en **iPhone** con **Expo Go** (gratis) desde el ordenador del responsable.
- Fuente principal: la **cuenta propia** de LALIGA Fantasy, consultada desde el dispositivo (ADR 0003).
- Supabase e ingest son **opcionales**: solo si la API oficial no da el historial que necesitamos
  (precios diarios, precisión). Lo decidimos con el HAR.
- Webs de terceros (FutbolFantasy, Analítica Fantasy): solo si su `robots.txt` y sus condiciones lo
  permiten, con lectura suave (pocas peticiones al día, caché, solo lo que se muestra) y sin
  redistribuir. Si lo prohíben, se ponen enlaces a sus páginas.
- Se mantiene la calidad técnica (tests, tipos, CI): sigue siendo el criterio del proyecto.
