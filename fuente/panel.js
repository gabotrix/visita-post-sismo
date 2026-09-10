/* Panel de consulta de las visitas post-sismo. */
(function () {
  'use strict';

  var API = 'https://ymbzpuxyvquvawfdntly.supabase.co/functions/v1/consultar-visitas';
  var DIC = window.ETIQUETAS;
  var clave = '', mapa = null, capa = null, visitas = [], resumen = null;
  var abierta = null;   // la visita del panel lateral, para poder corregirla

  var $ = function (s) { return document.querySelector(s); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var COLOR = { habitable: '#15723A', uso_restringido: '#B36B00', no_habitable: '#C0272D' };
  var PASTILLA = { habitable: ['p-v', 'Habitable'], uso_restringido: ['p-a', 'Uso restringido'],
                   no_habitable: ['p-r', 'No habitable'] };
  function color(v) {
    if (v.estado_colapso === 'total') return '#5C2020';
    return COLOR[v.habitabilidad] || '#8A949C';
  }
  function pastilla(v) {
    if (v.estado_colapso === 'total') return '<span class="pastilla p-r">Colapso total</span>';
    var p = PASTILLA[v.habitabilidad];
    return p ? '<span class="pastilla ' + p[0] + '">' + p[1] + '</span>'
             : '<span class="pastilla p-n">Sin clasificar</span>';
  }

  // en el XLSForm la escala de daño se etiqueta con una sola letra; en un informe
  // eso no dice nada, así que aquí va la palabra entera
  var NLMS = { n: 'Ninguno', l: 'Leve', m: 'Moderado', s: 'Severo' };

  // el código del municipio se traduce con la misma lista que usa el formulario
  function nombreLista(lista, v) {
    if (lista === 'nivel_nlms' && NLMS[v]) return NLMS[v];
    var l = (DIC.listas || {})[lista] || [];
    for (var i = 0; i < l.length; i++) if (String(l[i].v) === String(v)) return l[i].l;
    return v;
  }
  var muni = function (c) { return c ? nombreLista('municipio', c) : '—'; };

  function fecha(s) {
    if (!s) return '—';
    var d = new Date(s);
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit' });
  }

  // ---------------------------------------------------------------- red
  function pide(cuerpo) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-clave-panel': clave },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      if (r.status === 401) throw new Error('clave');
      if (!r.ok) throw new Error('http ' + r.status);
      var t = r.headers.get('content-type') || '';
      return t.indexOf('json') > -1 ? r.json() : r.text();
    });
  }

  // ---------------------------------------------------------------- acceso
  $('#entrar').addEventListener('click', entra);
  $('#clave').addEventListener('keydown', function (e) { if (e.key === 'Enter') entra(); });

  function entra() {
    var k = $('#clave').value.trim();
    if (!k) return;
    clave = k;
    $('#entrar').disabled = true; $('#entrar').textContent = 'Comprobando…';
    pide({ accion: 'resumen' }).then(function (r) {
      try { sessionStorage.setItem('panel.clave', k); } catch (e) {}
      resumen = r;
      $('#acceso').style.display = 'none';
      $('#panel').style.display = 'block';
      $('#quien').textContent = r.panel || '';
      pintaCifras(r);
      arrancaMapa();
      cargaLista();
    }).catch(function (e) {
      clave = '';
      $('#entrar').disabled = false; $('#entrar').textContent = 'Entrar';
      var m = $('#errAcceso'); m.hidden = false;
      m.textContent = e.message === 'clave'
        ? 'Esa clave no es válida o fue revocada.'
        : 'No se pudo conectar. Revise la conexión e inténtelo otra vez.';
    });
  }

  // ---------------------------------------------------------------- cifras
  function pintaCifras(r) {
    var c = [
      ['', r.total, 'visitas'],
      ['v', r.verde, 'habitables'],
      ['a', r.amarillo, 'uso restringido'],
      ['r', r.rojo, 'no habitables'],
      ['x', r.colapso_total, 'colapso total'],
      ['', r.sin_clasif, 'sin clasificar'],
      ['', Number(r.escombros_m3 || 0).toLocaleString('es-CO'), 'm³ de escombros'],
      ['', r.fotos, 'fotografías'],
      ['', r.evaluadores, 'evaluadores']
    ];
    $('#cifras').innerHTML = c.map(function (x) {
      return '<div class="cifra ' + x[0] + '"><div class="n">' + esc(x[1]) +
             '</div><div class="k">' + x[2] + '</div></div>';
    }).join('');

    var sel = $('#fMunicipio');
    if (sel.options.length <= 1) {
      (r.por_municipio || []).forEach(function (m) {
        var o = document.createElement('option');
        o.value = m.municipio;
        o.textContent = muni(m.municipio) + ' (' + m.total + ')';
        sel.appendChild(o);
      });
    }
    $('#pie').innerHTML = 'Última visita recibida: <b>' + esc(fecha(r.ultima)) + '</b>. ' +
      'Los datos de contacto del propietario no salen en la tabla ni en el CSV: ' +
      'se ven solo al abrir una visita.';
  }

  // ---------------------------------------------------------------- mapa
  function arrancaMapa() {
    if (mapa || typeof L === 'undefined') {
      if (typeof L === 'undefined') {
        $('#mapa').innerHTML = '<div class="sinmapa">No se pudo cargar el mapa. ' +
          'La tabla de abajo funciona igual.</div>';
      }
      return;
    }
    mapa = L.map('mapa', { scrollWheelZoom: false }).setView([5.0689, -75.5174], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(mapa);
    capa = L.layerGroup().addTo(mapa);
    // si el contenedor cambia de tamaño (ventana, panel lateral), Leaflet sigue
    // dibujando con las medidas viejas y el mapa queda a medio ancho
    window.addEventListener('resize', function () { mapa.invalidateSize(); });
    setTimeout(function () { mapa.invalidateSize(); }, 60);
  }

  function pintaMapa() {
    if (!mapa || !capa) return;
    mapa.invalidateSize();
    capa.clearLayers();
    var puntos = [];
    visitas.forEach(function (v) {
      if (typeof v.lat !== 'number' || typeof v.lon !== 'number') return;
      puntos.push([v.lat, v.lon]);
      L.circleMarker([v.lat, v.lon], {
        radius: 7, color: '#fff', weight: 2, opacity: 1,
        fillColor: color(v), fillOpacity: .9
      }).addTo(capa).bindPopup(
        '<b>' + esc(v.codigo_registro || 'Sin código') + '</b><br>' +
        esc(v.direccion || '') + '<br>' +
        '<a href="#" data-ver="' + esc(v.id) + '">Ver la visita</a>'
      );
    });
    if (puntos.length) mapa.fitBounds(puntos, { padding: [30, 30], maxZoom: 15 });
  }

  // abrir el detalle desde el globo del mapa
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-ver]') : null;
    if (!a) return;
    e.preventDefault();
    abre(a.getAttribute('data-ver'));
  });

  // ---------------------------------------------------------------- lista
  var tecleo = null;
  ['#fMunicipio', '#fHab'].forEach(function (s) {
    $(s).addEventListener('change', cargaLista);
  });
  $('#fBusca').addEventListener('input', function () {
    clearTimeout(tecleo); tecleo = setTimeout(cargaLista, 300);
  });
  $('#refrescar').addEventListener('click', function () {
    pide({ accion: 'resumen' }).then(function (r) { resumen = r; pintaCifras(r); });
    cargaLista();
  });

  function filtros() {
    return { municipio: $('#fMunicipio').value || null,
             habitabilidad: $('#fHab').value || null,
             busca: $('#fBusca').value.trim() || null };
  }

  function cargaLista() {
    $('#cuenta').textContent = 'cargando…';
    var f = filtros(); f.accion = 'lista';
    pide(f).then(function (r) {
      visitas = r.visitas || [];
      pintaFilas();
      pintaMapa();
    }).catch(function () {
      $('#cuenta').textContent = 'no se pudo cargar';
    });
  }

  function pintaFilas() {
    $('#cuenta').textContent = visitas.length +
      (visitas.length === 1 ? ' visita' : ' visitas');
    $('#vacio').hidden = visitas.length > 0;
    if (!visitas.length) {
      $('#vacio').textContent = resumen && resumen.total
        ? 'Ninguna visita coincide con el filtro.'
        : 'Todavía no ha llegado ninguna visita desde los teléfonos.';
    }
    $('#filas').innerHTML = visitas.map(function (v) {
      return '<tr data-ver="' + esc(v.id) + '">' +
        '<td class="mono">' + esc(v.codigo_registro || '—') + '</td>' +
        '<td class="ancho">' + esc(v.direccion || '—') + '</td>' +
        '<td>' + esc(v.barrio_vereda || '—') + '</td>' +
        '<td>' + esc(muni(v.municipio)) + '</td>' +
        '<td>' + pastilla(v) + '</td>' +
        '<td>' + esc(v.nivel_dano ? nombreLista('nivel_dano', v.nivel_dano) : '—') + '</td>' +
        '<td>' + esc(v.num_pisos == null ? '—' : v.num_pisos) + '</td>' +
        '<td>' + esc(v.volumen_escombros == null ? '—' : v.volumen_escombros) + '</td>' +
        '<td>' + esc(v.fotos || 0) + '</td>' +
        '<td>' + esc(fecha(v.recibida_en)) + '</td></tr>';
    }).join('');
  }

  // ---------------------------------------------------------------- detalle
  function cierra() {
    $('#detalle').style.display = 'none';
    $('#velo').style.display = 'none';
  }
  $('#velo').addEventListener('click', cierra);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cierra(); });

  function abre(id) {
    var d = $('#detalle');
    d.style.display = 'block'; $('#velo').style.display = 'block';
    d.scrollTop = 0;
    d.innerHTML = '<button class="cerrar" type="button" id="cerrarDet">&times;</button>' +
                  '<div class="cargando">Cargando la visita…</div>';
    $('#cerrarDet').addEventListener('click', cierra);

    pide({ accion: 'detalle', id: id }).then(function (r) {
      var v = r.visita, R = v.respuestas || {};
      abierta = v;
      var h = '<button class="cerrar" type="button" id="cerrarDet">&times;</button>' +
        '<div class="eyebrow">' + esc(muni(v.municipio)) + '</div>' +
        '<h2>' + esc(v.codigo_registro || 'Visita sin código') + '</h2>' +
        '<div style="margin:8px 0 4px">' + pastilla(v) + '</div>';

      var cab = [
        ['Dirección', v.direccion], ['Barrio / Vereda', v.barrio_vereda],
        ['Coordenadas', v.lat != null ? v.lat.toFixed(6) + ', ' + v.lon.toFixed(6) +
          ' (±' + Math.round(v.precision_gps || 0) + ' m)' : null],
        ['Nivel de daño', v.nivel_dano ? nombreLista('nivel_dano', v.nivel_dano) : null],
        ['Volumen de escombros', v.volumen_escombros ? v.volumen_escombros + ' m³' : null],
        ['Evaluador', v.evaluador_nombre],
        ['Entidad', v.entidad ? nombreLista('entidad', v.entidad) : null],
        ['Recibida', fecha(v.recibida_en)]
      ].filter(function (x) { return x[1]; });
      h += '<div class="grupo"><h3>Resumen</h3>' + cab.map(function (x) {
        return '<dl class="par"><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></dl>';
      }).join('') + '</div>';

      // fotografías, con URL firmada de diez minutos
      if ((r.fotos || []).length) {
        h += '<div class="grupo"><h3>Fotografías (' + r.fotos.length + ')</h3><div class="fotos">' +
          r.fotos.map(function (f) {
            var et = (DIC.campos[f.campo] || {}).l || f.campo;
            return '<figure><img loading="lazy" src="' + esc(f.url) + '" alt="' + esc(et) +
                   '"><figcaption>' + esc(et) + '</figcaption></figure>';
          }).join('') + '</div></div>';
      }

      // el resto de respuestas, agrupadas por el apartado del formulario
      var grupos = {}, ordenGrupos = [];
      (DIC.orden || []).forEach(function (n) {
        if (!(n in R)) return;
        var meta = DIC.campos[n] || {}, val = R[n];
        if (val === '' || val === null || val === undefined) return;
        if (Array.isArray(val) && !val.length) return;
        var g = meta.s || 'Otros';
        if (!grupos[g]) { grupos[g] = []; ordenGrupos.push(g); }
        grupos[g].push([meta.l || n, formatea(val, meta), n]);
      });
      ordenGrupos.forEach(function (g) {
        h += '<div class="grupo"><h3>' + esc(g) + '</h3>' + grupos[g].map(function (x) {
          return '<dl class="par"><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></dl>';
        }).join('') + '</div>';
      });

      h += '<div class="acciones">' +
           '<button type="button" data-act="corregir">Corregir</button>' +
           '<button type="button" class="peligro" data-act="borrar">Borrar visita</button>' +
           '</div><div id="zona"></div>';
      d.innerHTML = h;
      $('#cerrarDet').addEventListener('click', cierra);
      cargaBitacora(v.id);
    }).catch(function () {
      d.innerHTML = '<button class="cerrar" type="button" id="cerrarDet">&times;</button>' +
                    '<div class="cargando">No se pudo cargar la visita.</div>';
      $('#cerrarDet').addEventListener('click', cierra);
    });
  }

  function formatea(val, meta) {
    if (Array.isArray(val)) {
      if (typeof val[0] === 'string' && val[0].indexOf('/') > -1 && !meta.li) {
        return val.length + (val.length === 1 ? ' fotografía' : ' fotografías');
      }
      return val.map(function (v) {
        return meta.li ? nombreLista(meta.li, v) : v;
      }).join(', ');
    }
    if (val && typeof val === 'object') {
      return val.lat != null ? val.lat.toFixed(5) + ', ' + val.lon.toFixed(5) : JSON.stringify(val);
    }
    if (meta.li) return nombreLista(meta.li, val);
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    var s = String(val);
    if (meta.u) s += ' ' + meta.u;
    return s;
  }


  // ---------------------------------------------------------------- CSV
  $('#descargar').addEventListener('click', function () {
    var b = this, t = b.textContent;
    b.disabled = true; b.textContent = 'Preparando…';
    var f = filtros(); f.accion = 'csv';
    pide(f).then(function (texto) {
      var url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = 'visitas-post-sismo-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      b.disabled = false; b.textContent = t;
    }).catch(function () {
      b.disabled = false; b.textContent = 'No se pudo descargar';
      setTimeout(function () { b.textContent = t; }, 2500);
    });
  });

  // ---------------------------------------------------------------- bitácora
  function cargaBitacora(id) {
    pide({ accion: 'correcciones', id: id }).then(function (r) {
      var c = r.correcciones || [];
      if (!c.length) return;
      var z = $('#zona');
      if (!z || z.dataset.bitacora) return;
      z.dataset.bitacora = '1';
      z.insertAdjacentHTML('beforebegin',
        '<div class="grupo"><h3>Correcciones (' + c.length + ')</h3><div class="bitacora">' +
        c.map(function (x) {
          return '<div><b>' + esc(etiquetaCampo(x.campo)) + '</b>: ' +
            esc(valorLegible(x.campo, x.antes)) + ' &rarr; ' +
            esc(valorLegible(x.campo, x.despues)) + '<br>' +
            esc(x.motivo) + '<br><span class="cuando">' + esc(fecha(x.creada_en)) +
            '</span></div>';
        }).join('') + '</div></div>');
    }).catch(function () {});
  }

  // ---------------------------------------------------------------- corregir
  // Solo estos campos. Lo que respondió el evaluador en campo no se toca.
  var EDITABLES = [
    ['codigo_registro', 'Código de registro', 'texto'],
    ['direccion', 'Dirección', 'texto'],
    ['barrio_vereda', 'Barrio / Vereda', 'texto'],
    ['municipio', 'Municipio', 'municipio'],
    ['habitabilidad', 'Habitabilidad', 'habitabilidad'],
    ['nivel_dano', 'Nivel de daño', 'nivel_dano'],
    ['estado_colapso', 'Estado de colapso', 'estado_colapso'],
    ['num_pisos', 'Número de pisos', 'numero'],
    ['volumen_escombros', 'Volumen de escombros (m³)', 'numero']
  ];
  function etiquetaCampo(c) {
    for (var i = 0; i < EDITABLES.length; i++) if (EDITABLES[i][0] === c) return EDITABLES[i][1];
    return c;
  }
  function valorLegible(campo, v) {
    if (v === null || v === undefined || v === '') return '—';
    var t = { municipio: 'municipio', habitabilidad: 'habitabilidad',
              nivel_dano: 'nivel_dano', estado_colapso: 'estado_colapso' }[campo];
    return t ? nombreLista(t, v) : v;
  }
  function opcionesDe(tipo, actual) {
    var l = (DIC.listas || {})[tipo] || [];
    return '<option value="">— sin dato —</option>' + l.map(function (o) {
      return '<option value="' + esc(o.v) + '"' +
        (String(actual) === String(o.v) ? ' selected' : '') + '>' + esc(o.l) + '</option>';
    }).join('');
  }

  function pintaCorregir() {
    var v = abierta, z = $('#zona'); if (!v || !z) return;
    z.innerHTML = '<div class="form"><h3>Corregir la visita</h3>' +
      '<p class="nota">Solo estos campos. Cada cambio queda registrado con su valor ' +
      'anterior y el motivo; el resto del formulario no se toca.</p>' +
      EDITABLES.map(function (e) {
        var val = v[e[0]] == null ? '' : v[e[0]];
        var ctl;
        if (e[2] === 'numero') {
          ctl = '<input type="number" step="any" data-c="' + e[0] + '" value="' + esc(val) + '">';
        } else if (e[2] === 'texto') {
          ctl = '<input type="text" data-c="' + e[0] + '" value="' + esc(val) + '">';
        } else {
          ctl = '<select data-c="' + e[0] + '">' + opcionesDe(e[2], val) + '</select>';
        }
        return '<div class="campo" data-campo="' + e[0] + '"><label>' + esc(e[1]) +
               '</label>' + ctl + '</div>';
      }).join('') +
      '<div class="campo"><label>Motivo *</label>' +
      '<textarea id="motivo" placeholder="Por qué se corrige. Queda en la bitácora."></textarea></div>' +
      '<div class="pie"><button type="button" id="guardarCorr">Guardar la corrección</button>' +
      '<button type="button" class="gris" id="cancelarCorr">Cancelar</button>' +
      '<span id="msgCorr"></span></div></div>';

    // resaltar lo que cambió respecto al original
    [].forEach.call(z.querySelectorAll('[data-c]'), function (el) {
      el.addEventListener('input', function () {
        var orig = abierta[el.dataset.c];
        var igual = String(orig == null ? '' : orig) === String(el.value);
        el.closest('.campo').classList.toggle('cambiado', !igual);
      });
    });
    $('#cancelarCorr').addEventListener('click', function () { z.innerHTML = ''; });
    $('#guardarCorr').addEventListener('click', guardaCorreccion);
    z.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function guardaCorreccion() {
    var z = $('#zona'), msg = $('#msgCorr');
    var motivo = $('#motivo').value.trim();
    if (motivo.length < 5) {
      msg.className = 'aviso'; msg.textContent = 'Escriba el motivo.';
      return;
    }
    var cambios = {};
    [].forEach.call(z.querySelectorAll('[data-c]'), function (el) {
      var orig = abierta[el.dataset.c];
      if (String(orig == null ? '' : orig) !== String(el.value)) cambios[el.dataset.c] = el.value;
    });
    if (!Object.keys(cambios).length) {
      msg.className = 'aviso'; msg.textContent = 'No cambió ningún campo.';
      return;
    }
    var b = $('#guardarCorr'); b.disabled = true; b.textContent = 'Guardando…';
    var id = abierta.id;
    pide({ accion: 'corregir', id: id, motivo: motivo, cambios: cambios })
      .then(function () {
        msg.className = 'ok'; msg.textContent = 'Guardado.';
        cargaLista();
        pide({ accion: 'resumen' }).then(function (r) { resumen = r; pintaCifras(r); });
        setTimeout(function () { abre(id); }, 700);
      }).catch(function () {
        b.disabled = false; b.textContent = 'Guardar la corrección';
        msg.className = 'aviso'; msg.textContent = 'No se pudo guardar.';
      });
  }

  // ---------------------------------------------------------------- borrar
  function pintaBorrar() {
    var v = abierta, z = $('#zona'); if (!v || !z) return;
    z.innerHTML = '<div class="form"><h3>Borrar esta visita</h3>' +
      '<p class="nota">Se borra la visita y sus fotografías, sin vuelta atrás. ' +
      'El motivo queda en el registro del servidor.</p>' +
      '<div class="campo"><label>Motivo *</label>' +
      '<textarea id="motivoDel" placeholder="Por ejemplo: registro duplicado de la misma edificación."></textarea></div>' +
      '<div class="pie"><button type="button" id="confirmarDel" ' +
      'style="background:var(--rojo);border-color:var(--rojo)">Borrar definitivamente</button>' +
      '<button type="button" class="gris" id="cancelarDel">Cancelar</button>' +
      '<span id="msgDel"></span></div></div>';
    $('#cancelarDel').addEventListener('click', function () { z.innerHTML = ''; });
    $('#confirmarDel').addEventListener('click', function () {
      var motivo = $('#motivoDel').value.trim(), msg = $('#msgDel');
      if (motivo.length < 5) { msg.className = 'aviso'; msg.textContent = 'Escriba el motivo.'; return; }
      var b = this; b.disabled = true; b.textContent = 'Borrando…';
      pide({ accion: 'borrar', id: abierta.id, motivo: motivo }).then(function () {
        cierra(); cargaLista();
        pide({ accion: 'resumen' }).then(function (r) { resumen = r; pintaCifras(r); });
      }).catch(function () {
        b.disabled = false; b.textContent = 'Borrar definitivamente';
        msg.className = 'aviso'; msg.textContent = 'No se pudo borrar.';
      });
    });
    z.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b) return;
    if (b.dataset.act === 'corregir') pintaCorregir();
    if (b.dataset.act === 'borrar') pintaBorrar();
  });

  // ---------------------------------------------------------------- purgar
  $('#purgar').addEventListener('click', function () {
    var b = this, t = b.textContent;
    b.disabled = true; b.textContent = 'Buscando…';
    pide({ accion: 'purgar' }).then(function (r) {
      b.textContent = r.purgadas ? r.purgadas + ' borradas' : 'No hay huérfanas';
      setTimeout(function () { b.disabled = false; b.textContent = t; }, 2600);
    }).catch(function () {
      b.disabled = false; b.textContent = 'No se pudo purgar';
      setTimeout(function () { b.textContent = t; }, 2500);
    });
  });

  // ---------------------------------------------------------------- arranque
  try {
    var g = sessionStorage.getItem('panel.clave');
    if (g) { $('#clave').value = g; entra(); }
  } catch (e) {}
})();
