# Publicación

Está en línea en **<https://gabotrix.github.io/visita-post-sismo/>**, servido por GitHub
Pages desde la rama `main` del repositorio `gabotrix/visita-post-sismo`.

| Dirección | Para quién |
|---|---|
| [/](https://gabotrix.github.io/visita-post-sismo/) | portada con los dos accesos |
| [/visita.html](https://gabotrix.github.io/visita-post-sismo/visita.html) | la app de campo |
| [/panel.html](https://gabotrix.github.io/visita-post-sismo/panel.html) | el panel de la alcaldía |

## Por qué el repositorio es público

Pages privado obligaría a cada visitante a iniciar sesión en GitHub y estar en la
organización. Las brigadas en campo no van a hacer eso.

Que sea público es seguro **porque ningún archivo del repositorio contiene claves**. Antes
de subirlo se sacó la clave de dispositivo del HTML: ahora cada evaluador la pega una vez
en «datos del evaluador» y queda solo en su teléfono. El panel la pide al entrar. Lo único
que viaja en el código es la URL de las edge functions, que sin clave devuelven 401.

## Entregar un teléfono a un evaluador

1. Abrir <https://gabotrix.github.io/visita-post-sismo/visita.html> **con señal**.
2. Menú del navegador → *Instalar aplicación* / *Añadir a la pantalla de inicio*.
3. Abrir desde el icono → *Registrar datos del evaluador*.
4. Rellenar nombre, documento, profesión, entidad y **pegar la clave del equipo**.
5. Listo. A partir de ahí funciona sin señal y envía solo cuando haya red.

La clave se entrega a mano o por mensaje directo, nunca dentro de un enlace: en el enlace
quedaría en el historial y en cualquier reenvío.

## Publicar una versión nueva

```bash
python fuente/optimizar.py    # solo si cambió el XLSForm
python fuente/build.py        # regenera visita.html y panel.html
node   fuente/test.js         # 21 comprobaciones
git add -A && git commit -m "..." && git push
```

Pages reconstruye solo, en menos de un minuto. Si cambiaste `visita.html`, sube también el
número de `CACHE` en `sw.js` (`psismo-v1` → `psismo-v2`); si no, los teléfonos ya
instalados seguirán con la versión guardada hasta que el service worker la reemplace por
su cuenta.

## Lo que no cubre GitHub Pages

- **No hay servidor**: todo el trabajo pesado está en Supabase. Pages solo sirve archivos.
- **Sin control de acceso**: cualquiera puede abrir el formulario. No pasa nada, porque sin
  clave no envía nada; pero cualquiera puede ver cómo es la encuesta.
- **El historial es público.** Si alguna vez se sube una clave por error, no basta con
  borrarla en el commit siguiente: hay que revocarla en `claves_acceso` y repartir otra.
