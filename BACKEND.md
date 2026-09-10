# Backend en Supabase

Cuenta **alcaldía** — `alcaldia@gabotrix.com's Org` (`gpifywgqmifqfzsdyzqk`)
Proyecto `ymbzpuxyvquvawfdntly`, región us-east-2, Postgres 17.6

## Cómo entra una visita

```
app en el teléfono  ──POST──>  edge function recibir-visita  ──service_role──>  tablas
      (clave de dispositivo en la cabecera x-clave-dispositivo)
```

La función es la **única** puerta. Las tres tablas tienen RLS activo y **cero políticas**,
así que con la clave `anon` no se lee ni se escribe nada. El bucket es privado.

## Tablas

**`visitas`** — una fila por edificación. Los 17 campos por los que se consulta o se mapea
(código, dirección, municipio, lat/lon, habitabilidad, nivel de daño, volumen, pisos…) son
columnas de verdad; las 148 respuestas completas van en `respuestas jsonb`. Se hizo así
porque el formulario va a cambiar y una columna por pregunta obligaría a migrar la tabla
en cada ajuste. Hay índice GIN sobre el JSON, así que se puede filtrar por cualquier campo.

`id_dispositivo` es **único**: si la app reintenta porque se cayó la red justo después de
enviar, el reintento no duplica la visita.

**`visita_fotos`** — ruta en Storage, campo del formulario y tamaño. El archivo vive en el
bucket `fotos-visitas`, en `<id_dispositivo>/<campo>-<n>.jpg`.

**`claves_acceso`** — solo el **SHA-256** de cada clave, nunca la clave. Un volcado de
la base no sirve para enviar visitas falsas. Admite varias activas a la vez, así que se
puede dar una por brigada y revocar solo la que se filtre. La columna `rol` separa las
de teléfono (`dispositivo`, solo escriben) de las del panel (`panel`, solo leen).

## Repartir y revocar claves

Generar una:

```bash
python -c "import secrets,hashlib; k=secrets.token_urlsafe(36); print('clave:',k); print('hash:',hashlib.sha256(k.encode()).hexdigest())"
```

Darla de alta (solo el hash):

```sql
insert into public.claves_acceso (nombre, hash, rol)
values ('Brigada Norte', '<el hash>', 'dispositivo');
```

Revocar:

```sql
update public.claves_acceso
set activa = false, revocada_en = now()
where nombre = 'Brigada Norte';
```

Los teléfonos con esa clave dejan de poder enviar en el acto y la app avisa con un mensaje
claro; **no pierden nada**, las visitas siguen guardadas hasta que se les dé una clave nueva.

Para ver el uso: `select nombre, rol, activa, ultimo_uso from public.claves_acceso;`

## Consultas útiles

```sql
-- panorama por municipio y habitabilidad
select municipio, habitabilidad, count(*), sum(volumen_escombros) as m3
from public.visitas group by 1, 2 order by 1, 2;

-- lo que hay que evacuar hoy
select codigo_registro, direccion, barrio_vereda, lat, lon
from public.visitas
where habitabilidad = 'no_habitable' or estado_colapso = 'total'
order by recibida_en desc;

-- filtrar por cualquier pregunta del formulario (usa el índice GIN)
select codigo_registro, direccion
from public.visitas
where respuestas @> '{"eva_dano_columnas": "s"}';

-- una respuesta suelta
select respuestas->>'comentarios_finales' from public.visitas limit 5;
```

Las fotos son privadas: se sacan con URL firmada. El panel (`panel.html`, ver [PANEL.md](PANEL.md)) ya hace todo esto con pantalla; ver también la vista `visitas_listado`, que oculta los datos de contacto del propietario.

```sql
select ruta from public.visita_fotos where visita_id = '<uuid>';
```

**`visita_correcciones`** — bitácora de los cambios hechos desde el panel: campo, valor
anterior, valor nuevo, motivo, con qué clave y cuándo. No se borra nunca.

## Nada de esto se alcanza con la clave pública

Las tablas tienen RLS activo sin políticas **y además** se les retiró el permiso a `anon`
y `authenticated`, así que PostgREST devuelve `42501` antes siquiera de mirar el RLS. Lo
mismo con las vistas `visitas_listado` y `fotos_huerfanas`, ambas con `security_invoker`.
La única puerta son las dos edge functions.

## Lo que falta

- **La purga no es automática.** Borrar desde el panel sí se lleva las fotos, y hay una
  acción para barrer huérfanas, pero nadie la ejecuta sola: convendría un `pg_cron`
  semanal que llame a la función.
