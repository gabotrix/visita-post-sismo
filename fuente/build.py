# -*- coding: utf-8 -*-
"""Arma las dos salidas a partir de la plantilla, el esquema y los scripts.

  visita.html           documento completo, se abre desde disco o desde un servidor
  visita-artifact.html  fragmento: el Artifact pone su propio <head>
"""
import io

tpl   = io.open("app_tpl.html", encoding="utf-8").read()
esq   = io.open("esquema.json", encoding="utf-8").read()
alm   = io.open("almacen.js", encoding="utf-8").read()
js    = io.open("app.js", encoding="utf-8").read()
fuente = io.open("fuente-marca.css", encoding="utf-8").read()   # DM Sans + Space Grotesk incrustadas (sin red)
import base64
logo = "data:image/webp;base64," + base64.b64encode(io.open("logo-infi.webp", "rb").read()).decode()

frag = (tpl.replace("{{LOGO}}", logo).replace("/*FUENTE*/", fuente)
           .replace("/*ALMACEN*/", alm)
           .replace("/*ESQUEMA*/", "window.ESQUEMA=" + esq + ";")
           .replace("/*APP*/", js))

io.open("../visita-artifact.html", "w", encoding="utf-8").write(frag)

doc = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="color-scheme" content="light dark">\n'
       '<meta name="theme-color" content="#0B3C5D">\n'
       '<meta name="mobile-web-app-capable" content="yes">\n'
       '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
       '<meta name="apple-mobile-web-app-title" content="Post-sismo">\n'
       '</head>\n<body style="margin:0">\n' + frag + '\n</body>\n</html>\n')
io.open("../visita.html", "w", encoding="utf-8").write(doc)

# La app tiene que cargar sin red. El único enlace externo permitido es el
# endpoint de envío, que solo se usa al pulsar "Enviar", nunca al abrir.
import re
PERMITIDO = re.compile(r'https://[a-z0-9]+\.supabase\.co/functions/v1/\S*'
                       r'|http://www\.w3\.org/2000/svg')
for nombre, txt in (("fragmento", frag), ("autonoma", doc)):
    resto = PERMITIDO.sub("", txt)
    fuera = re.findall(r'https?://[^\s"\'()]+', resto)
    print("%-10s %7d bytes   carga desde fuera: %s"
          % (nombre, len(txt), ", ".join(sorted(set(fuera))[:3]) if fuera else "nada"))

# ---- panel de consulta (no puede ser Artifact: la CSP bloquea el fetch a Supabase)
tplp = io.open("panel_tpl.html", encoding="utf-8").read()
import os
etq  = io.open("etiquetas.json" if os.path.exists("etiquetas.json") else "../etiquetas.json", encoding="utf-8").read()
pjs  = io.open("panel.js", encoding="utf-8").read()
panel = (tplp.replace("/*FUENTE*/", fuente)
             .replace("/*ETIQUETAS*/", "window.ETIQUETAS=" + etq + ";")
             .replace("/*PANEL*/", pjs))
io.open("../panel.html", "w", encoding="utf-8").write(panel)
print("%-10s %7d bytes" % ("panel", len(panel)))
