# Cómo usarla sin conexión

Tres formas de llevarla a campo. La primera es la buena; las otras dos sirven según lo
que tengas a mano.

## 1. Instalada en el teléfono (recomendada)

Sube a un servidor propio, en la misma carpeta, estos cuatro archivos:

```
visita.html
sw.js
manifest.webmanifest
icono.svg
```

Tiene que ser **https** (o `localhost`): sin eso el navegador no deja instalar la app ni
registrar el service worker. Cualquier hosting estático sirve — un bucket de Supabase
Storage con acceso público, Netlify, GitHub Pages, o la propia web de la empresa.

En el teléfono, con señal, se abre `https://tu-dominio/visita.html` una vez. Chrome
ofrece **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"** (en el menú de
tres puntos). A partir de ahí:

- Abre desde el icono, a pantalla completa, sin barra del navegador.
- Arranca **sin señal**: el service worker guardó la aplicación entera.
- Las visitas y las fotos viven en el teléfono (IndexedDB).
- Cuando vuelva a haber red, la app se actualiza sola si subiste una versión nueva.

Al publicar una versión nueva, sube el número de `CACHE` en `sw.js` (`psismo-v1` →
`psismo-v2`) para que reemplace la anterior.

## 2. El archivo suelto en el teléfono

Copia `visita.html` al teléfono y ábrelo desde la app de Archivos. No necesita servidor
ni señal: el archivo lleva dentro el cuestionario, la tipografía y todo el programa.

**Aviso importante:** al abrirlo así (`file://`), Chrome bloquea IndexedDB. La app lo
detecta, sigue funcionando y guarda las respuestas en `localStorage`, pero **no guarda
las fotografías**: si cierras la app a medias hay que volver a tomarlas. La propia
pantalla te lo dice. Si vas a tomar fotos, usa la opción 1.

## 3. La página publicada

`https://claude.ai/code/artifact/142ca4d9-80a4-483a-860d-269ead8968ae`

Se abre con señal y a partir de ahí, mientras no cierres la pestaña, puedes trabajar sin
red. Las visitas y las fotos sí se guardan en el teléfono y siguen ahí al volver. Lo que
no puede es **arrancar** sin señal, porque ahí no hay service worker. Sirve para probar,
no para un día de campo.

## Qué se guarda y dónde

| Qué | Dónde | Sobrevive a |
|---|---|---|
| Datos del evaluador | `localStorage` | cerrar la app, quedarse sin batería |
| Visitas y respuestas | IndexedDB | cerrar la app, quedarse sin batería |
| Fotografías | IndexedDB, reducidas a 1280 px y JPEG al 72 % | lo mismo |
| La aplicación en sí | Caché del service worker | quedarse sin señal (solo opción 1) |

Se guarda en cada toque, no hay botón de guardar. Al salir de una visita a medias queda
como **Sin terminar** y se puede retomar en el punto exacto. Al cerrarla queda **Lista
para enviar**.

La app pide `navigator.storage.persist()` al arrancar, para que el navegador no borre
los datos si al teléfono le falta espacio.

## Enviar cuando vuelva la señal

Sin servidor configurado, el botón de la bandeja dice **Exportar** y copia al
portapapeles todas las visitas listas, en JSON.

Para que envíe de verdad, en `fuente/app.js` busca:

```js
var CONFIG = { endpoint: null, cabeceras: {} };
```

y pon la URL de tu edge function:

```js
var CONFIG = {
  endpoint: 'https://<proyecto>.supabase.co/functions/v1/recibir-visita',
  cabeceras: { apikey: '<clave anon>' }
};
```

Luego `python build.py` para regenerar `visita.html`.

Manda un `POST` con `{ visitas: [ { id, creada, perfil, respuestas } ] }`. Las visitas
solo se marcan como **enviadas** si el servidor responde 2xx; si falla o no hay red,
siguen en cola y no se pierde nada. Las fotos van dentro de `respuestas` como data URL,
así que conviene que la función las suba a Storage y guarde solo la ruta.

## Cuánto ocupa

La app son 165 KB y no pide **nada** a la red: ni tipografías, ni librerías, ni mapas.
Cada foto pesa entre 80 y 200 KB ya reducida. Un teléfono normal da unos 2 GB para esto,
o sea miles de fotografías. La bandeja muestra abajo cuánto llevas ocupado.
