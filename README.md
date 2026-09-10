# Evaluación post-sismo — Caldas y Risaralda

Levantamiento de daños en edificaciones tras un sismo. Dos piezas sobre un mismo backend.

| | |
|---|---|
| **[visita.html](visita.html)** | La app de campo. 148 preguntas adaptativas, funciona **sin conexión**, guarda visitas y fotos en el teléfono y las envía cuando hay red. Instalable en la pantalla de inicio. |
| **[panel.html](panel.html)** | El panel de la alcaldía. Mapa, cifras por municipio, buscador, corrección con bitácora y descarga en Excel. |

Nace del formulario de ArcGIS Survey123 «Encuesta integral post-sismo Colombia»
(item `ad5ce3ac27d847a1be59668d55e2ae2c`). No es un port: de las 200 preguntas del
original quedaron 148 visibles, y se corrigieron dos errores del formulario de origen.
El detalle está en [INFORME-PODA.txt](INFORME-PODA.txt).

## Cómo se arma

Ninguno de los dos HTML se escribe a mano: se generan desde el XLSForm.

```bash
python fuente/optimizar.py   # XLSForm -> esquema.json, con la poda
python fuente/build.py       # esquema + plantillas -> visita.html y panel.html
node   fuente/test.js        # 21 comprobaciones del motor de saltos
```

## Seguridad

- Ningún HTML de este repositorio contiene claves. Cada evaluador pega la suya una vez
  y queda solo en su teléfono; el panel la pide al entrar.
- Las tablas tienen RLS activo y **sin políticas**: la clave pública de Supabase no lee
  ni escribe nada. La única puerta son dos edge functions.
- De las claves solo se guarda el SHA-256. Se revocan de una en una.
- Una clave de teléfono no puede consultar; una de panel no puede escribir.

## Documentación

- [SIN-CONEXION.md](SIN-CONEXION.md) — cómo llevarla a campo y las tres formas de usarla
- [BACKEND.md](BACKEND.md) — modelo de datos, claves y consultas
- [PANEL.md](PANEL.md) — el panel, permisos y privacidad
- [CUESTIONARIO.md](CUESTIONARIO.md) — las 200 preguntas del formulario original

---

GABOTRIX (OPENMARKT S.A.S.) para la alcaldía. Backend en Supabase.
