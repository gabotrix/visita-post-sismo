# Panel de consulta

`panel.html` — la pantalla para leer lo que llega de los teléfonos.

## Cómo se publica

Va **junto a la app**, en la misma carpeta del servidor:

```
visita.html          la app de campo
panel.html           esta pantalla
sw.js  manifest.webmanifest  icono.svg
```

No puede publicarse como Artifact de Claude: esas páginas tienen bloqueado el `fetch`
hacia dominios externos, y el panel necesita consultar Supabase. Tiene que ir en tu propio
hosting. El de la app ya sirve.

Se entra pegando la **clave del panel** (está en `CLAVE-PANEL.txt`). Queda en
`sessionStorage`: al cerrar la pestaña hay que volver a ponerla.

## Qué muestra

**Cifras arriba** — total de visitas, el semáforo de habitabilidad (habitables, uso
restringido, no habitables), colapsos totales, sin clasificar, metros cúbicos de escombros
acumulados, fotografías y cuántos evaluadores distintos han reportado.

**Mapa** — un punto por visita, del color de su clasificación; los colapsos totales en
granate. Al tocar un punto sale el código, la dirección y un enlace para abrir la visita.
El mapa usa teselas de OpenStreetMap, así que **el panel sí necesita internet** (la app de
campo no).

**Tabla** — filtrable por municipio y habitabilidad, y con búsqueda por código, dirección o
barrio. Al tocar una fila se abre la visita completa.

**Detalle** — las respuestas traducidas a texto legible, agrupadas por apartado del
formulario, y las fotografías. Las fotos salen con URL firmada de diez minutos: el bucket
es privado y no hay forma de llegar a ellas sin pasar por aquí.

**Descargar CSV** — respeta los filtros activos. Sale con separador `;` y BOM, así que
Excel en español lo abre en columnas y con los acentos bien, sin asistente de importación.

## Privacidad

El nombre, el celular y el documento del propietario **no salen** en la tabla ni en el CSV.
El listado se sirve desde la vista `visitas_listado`, que no los incluye. Solo aparecen al
abrir una visita concreta, que es cuando alguien tiene una razón para verlos.

## Las dos claves no se cruzan

| | Puede enviar visitas | Puede consultarlas |
|---|---|---|
| Clave de dispositivo (teléfonos) | sí | **no** |
| Clave de panel (alcaldía) | **no** | sí |

Está comprobado en las dos direcciones: una clave de teléfono robada no sirve para leer los
datos, y la del panel no sirve para inyectar visitas falsas.

Dar de alta una clave de panel para otra persona:

```bash
python -c "import secrets,hashlib; k=secrets.token_urlsafe(36); print('clave:',k); print('hash:',hashlib.sha256(k.encode()).hexdigest())"
```

```sql
insert into public.claves_acceso (nombre, hash, rol)
values ('Panel — Secretaría de Planeación', '<el hash>', 'panel');
```

Revocar: `update public.claves_acceso set activa=false, revocada_en=now() where nombre='...';`

Ver quién la ha usado: `select nombre, rol, activa, ultimo_uso from public.claves_acceso;`

## Lo que no tiene

- **No hay edición.** El panel solo lee. Corregir una visita mal diligenciada hay que
  hacerlo por SQL.
- **El mapa no agrupa.** Con unos cientos de puntos va bien; con miles habría que meter
  agrupamiento por cercanía.
- **No hay informe en PDF.** El CSV es la salida; el acta formal habría que armarla aparte.
- **La sesión no caduca sola.** Se cierra al cerrar la pestaña, nada más.
