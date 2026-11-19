# DESIGN.md · Ecosistema JHONNY_CORE · sistema «Marcador»

Aprobado por Oscar Polania el 18/11/2026. Rige para las 8 apps del ecosistema:
JHONNY-PRIV, JHONNY-PERDOMO, JHONNY-INSCRIPCION, JHONNY-ASISTENCIAS, JHONNY-VOTACION,
JHONNY-CRED, JHONNY-CENTER y JHONNY-COMERCIOS. Este archivo vive en JHONNY-PRIV; los
demás repos lo siguen igual (no hay kit compartido: cada app trae los mismos tokens en
su `css/style.css`, `css/estilo.css` o `css/cred.css`).

## Carácter
La campaña como un marcador de partido: **cuánto llevamos, cuánto falta y quién juega**.
Nace del logo (mascota que camina, aro verde), del banner (azul y cian) y del hashtag
naranja #EquipoDelHacer. Cada pantalla responde a primera vista «¿cómo vamos?» y lleva
a la acción en uno o dos toques.

**Regla de oro:** se innova sin quitar la esencia. Ninguna vista pierde botones,
filtros, pastillas ni colores con significado; cambian la superficie, la jerarquía y
el análisis a primera vista.

## Color (tokens en `:root`)
| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#0063D8` | Azul de acción: botones, pastillas activas, enlaces. Pasa 4,5:1 con blanco. |
| `--brand-graf` | `#007BFF` | El azul de la marca tal cual (CONFIG). Solo gráficas y fondos sin texto. |
| `--noche` / `--brand-900` | `#0A2540` | Tinta y fondo del marcador, splash y CRED. |
| `--pendiente` | `#C2410C` (`-050` `#FFF1E6`, `-700` `#9A3412`) | Lo que falta: llamadas a la acción, «sin puesto», mes en curso. |
| `--firme` | `#15803D` (`-050` `#DCFCE7`, `-700` `#166534`) | Firme con el voto, hecho, trabajado. |
| `--muted` | `#4B5B72` | Texto secundario (6,9:1 sobre blanco). |
| `--bg` / `--surface` / `--line` | `#F5F8FC` / `#FFFFFF` / `#E3E9F2` | Fondo, papel, líneas. |

Colores con significado que se conservan (Base de datos): Flandes `#1E9E6A`, Sin
consultar `#C2610A`, A la espera `#E8B923`, Por confirmar `#F59E42`, Otro municipio
`#D64545`, Inactivo gris. Se muestran como **borde completo de la tarjeta + fondo muy
suave del mismo tono**, nunca como franja lateral. Igual en Líderes (verde/azul/rojo por
referidos), Eventos, Agenda, Compromisos, Servicios y resultados de escaneo.

Marca blanca: `js/marca-vivo.js` recibe el color de CONFIG y calcula solo la versión que
pasa 4,5:1 (`--brand`) y deja el original en `--brand-graf`. Con el color original
(#007BFF) no inyecta nada y manda el CSS.

**Oscuro** (`html.oscuro`, CRED por sistema): fondo `#0F1826`/`#0B1626`, superficie
`#182333`, texto `#E9EEF7`, azul `#4EA0FF` (con letra oscura `#0A1526` en botones),
naranja `#FF9A5C`, verde `#4ADE80`.

## Letra
- Sora (ya cargada) 600–800 en títulos y **todas las cifras**, con `font-variant-numeric: tabular-nums`.
- Cuerpo: fuente del sistema. Sin fuentes nuevas.
- Rótulos en mayúscula solo cortos (11–12 px, espaciado 1,2 px).

## Forma
- Radios 10 / 12 / 16 / 18 px; pastillas 999 px.
- Borde de 1 px `--line` en tarjetas; sombra plana `0 1px 2px rgba(10,37,64,.06)`.
- Nada de resplandores de color, degradados de fondo ni texto con degradado.
- Zonas táctiles ≥ 44 px; `aria-label` en botones de solo ícono.

## Movimiento (el efecto propio)
- **El marcador rueda**: al abrir, las cifras suben una vez (`translateY` + opacidad,
  280 ms, escalonadas 60 ms) y las barras avanzan (`scaleX`/`scaleY`, 600 ms).
  Una sola vez por carga de página; los repintados (EN VIVO) no se animan.
- Salida suave `--salida: cubic-bezier(.2,.8,.2,1)`. Nada con rebote.
- Esqueletos que respiran (opacidad), nunca brillo que cruza.
- Puntos que laten solo si algo está EN VIVO de verdad o el analista está pensando.
- Todo con `prefers-reduced-motion: reduce` → sin animación.

## Patrón de Inicio (JHONNY PRIV, `js/marcador.js` + `css/marcador.css`)
1. Saludo y rol (como siempre).
2. **Marcador** (fondo noche): firmes con el voto sobre activos y %, barra por intención,
   No está seguro / No contactado / Sin preguntar / Nuevos del mes (cada uno abre la Base
   de datos ya filtrada) y el botón naranja «Preguntar intención a N».
3. **Piden tu acción**: por validar con la Registraduría, líderes sin activar, líderes con
   menos de 10 (solo filas con algo pendiente).
4. **Módulos** (las mismas baldosas; cada una con su ícono propio).
5. **Análisis**: por puesto, registros por mes (mes en curso en naranja), líderes que más suman.
En PC: marcador y acción lado a lado; análisis en 3 columnas.

Sin rutas nuevas: usa `priv.baseDatos` (act=1) y `priv.lideres` de la misma caché de
sesión (`rapCargar`, lecturas silenciosas en la cola de fondo). Si ya están en caché pinta
al instante; si no, los módulos se pintan primero y el marcador llega después, dejando
lista la Base de datos. Medición: `RED.pantalla('inicio.marcador[.cache|.red]')`.

Filtros que llegan desde el Inicio: `window.BD_PRESET = { int: [''] }` o
`{ chip: 'Por confirmar' }`; la Base de datos los aplica visibles (pastilla marcada).
La intención vacía tiene pastilla propia: «Sin preguntar».

## Prohibido
Franja de color al borde izquierdo (o `::before`/`inset` que la imite), texto con
degradado, rebote, puntos que laten sin estar en vivo, brillo que cruza, resplandores de
color, lavados de degradado, tarjetas dentro de tarjetas, íconos repetidos o sin relación
con la acción, emoji como ícono, pastillas que parecen botón y no hacen nada.

## Antes de publicar
Detector de Impeccable desde `/home/claude/imp` (código y página a 390 y 1280 px) en
cero, salvo lo legítimo marcado con comentario `impeccable-disable` y su motivo.
`js/version.js` arriba en cada app tocada y medición antes/después.
