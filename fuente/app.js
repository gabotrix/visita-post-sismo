/* Visita post-sismo — motor de formulario XLSForm en el navegador */
(function () {
  'use strict';

  var E = window.ESQUEMA;
  var D = {};                  // respuestas de la visita abierta
  var PERFIL = {};             // datos del evaluador, recordados
  var visita = null;           // la visita abierta: {id, estado, D, paso, resumen}
  var iPaso = 0, vista = 'bandeja';

  // Destino de los envíos. La clave NO va aquí: esta página se publica en una URL
  // pública y cualquiera podría sacarla del HTML. La pega cada evaluador una vez
  // en sus datos y queda solo en su teléfono.
  var CONFIG = {
    endpoint: 'https://ymbzpuxyvquvawfdntly.supabase.co/functions/v1/recibir-visita'
  };
  function claveEnvio() { return (PERFIL.clave_dispositivo || '').trim(); }

  // ---------------------------------------------------------------- utilidades
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------------------------------------------------------------- expresiones
  var cache = {};
  function compila(x) {
    if (cache[x]) return cache[x];
    // XLSForm compara con un solo '='. Se duplica sin tocar !=, >= ni <=.
    var s = ' ' + x + ' ';
    s = s.replace(/(^|[^!<>=])=(?!=)/g, '$1==');
    s = s.replace(/\$\{(\w+)\}/g, 'V("$1")');
    // count-selected va antes que selected: si no, "selected(" parte el nombre por la mitad
    s = s.replace(/\bcount-selected\s*\(/g, 'CNT(')
         .replace(/\bselected\s*\(/g, 'SEL(')
         .replace(/\bstring-length\s*\(/g, 'SLEN(')
         .replace(/\bformat-date-time\s*\(/g, 'FDT(')
         .replace(/\bregex\s*\(/g, 'RX(')
         .replace(/\bconcat\s*\(/g, 'CONCAT(')
         .replace(/\bround\s*\(/g, 'ROUND(')
         .replace(/\bpulldata\s*\(/g, 'PULL(')
         .replace(/\barea\s*\(/g, 'AREA(')
         .replace(/\bif\s*\(/g, 'IF(')
         .replace(/\btoday\s*\(\)/g, 'TODAY()')
         .replace(/\bnow\s*\(\)/g, 'NOW()');
    s = s.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bdiv\b/g, '/');
    s = s.replace(/(^|[\s(,])\.(?=[\s),]|$)/g, '$1CUR');
    var fn;
    try {
      fn = new Function('V', 'SEL', 'SLEN', 'CNT', 'FDT', 'RX', 'CONCAT', 'ROUND',
        'PULL', 'AREA', 'IF', 'TODAY', 'NOW', 'CUR',
        'try{return (' + s + ')}catch(e){return null}');
    } catch (e) { fn = function () { return null; }; }
    cache[x] = fn;
    return fn;
  }

  function V(n) { var v = D[n]; return v === undefined || v === null ? '' : v; }
  function SEL(v, c) { return Array.isArray(v) ? v.indexOf(c) > -1 : v === c; }
  function SLEN(v) { return Array.isArray(v) ? v.length : String(v == null ? '' : v).length; }
  function CNT(v) { return Array.isArray(v) ? v.length : (v ? 1 : 0); }
  function RX(v, p) { try { return new RegExp(p).test(String(v == null ? '' : v)); } catch (e) { return true; } }
  function CONCAT() { return Array.prototype.slice.call(arguments).join(''); }
  function ROUND(x, n) { var f = Math.pow(10, n || 0); return Math.round(Number(x) * f) / f; }
  function AREA() { return 0; }
  function IF(c, a, b) { return c ? a : b; }
  function TODAY() { return new Date().toISOString().slice(0, 10); }
  function NOW() { return new Date().toISOString(); }
  function FDT(v) {
    if (!v) return '';
    var d = new Date(v); if (isNaN(d)) return '';
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() +
           ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  function PULL(a, b, c) {
    if (a === '@geopoint' && b && typeof b === 'object') {
      return { x: b.lon, y: b.lat, horizontalAccuracy: b.acc }[c];
    }
    return '';
  }
  function ev(x, cur) {
    if (!x) return null;
    return compila(x)(V, SEL, SLEN, CNT, FDT, RX, CONCAT, ROUND, PULL, AREA, IF, TODAY, NOW, cur);
  }
  function visible(o) { return !o.relevant || ev(o.relevant) === true; }

  // ---------------------------------------------------------------- calculados
  function recalcula() {
    for (var v = 0; v < 2; v++) {
      E.pasos.forEach(function (p) {
        p.campos.forEach(function (f) {
          if (f.tipo !== 'calc' && f.tipo !== 'auto') return;
          if (f.tipo === 'auto') { if (!D[f.name]) D[f.name] = NOW(); return; }
          var r = ev(f.calc);
          D[f.name] = (r === null || r === undefined || (typeof r === 'number' && isNaN(r))) ? '' : r;
        });
      });
    }
  }

  // ---------------------------------------------------------------- listas
  function opciones(f) {
    var l = (E.listas[f.lista] || []).slice();
    if (f.filtro) {
      var m = /^(\w+)\s*=\s*\$\{(\w+)\}$/.exec(f.filtro.trim());
      if (m) { var val = String(V(m[2])); l = l.filter(function (o) { return String(o.f) === val; }); }
    }
    return l;
  }
  function etiqueta(f, val) {
    if (!f.lista) return val;
    var o = (E.listas[f.lista] || []).filter(function (x) { return x.v === val; })[0];
    return o ? o.l : val;
  }
  function textoValor(n) {
    var v = D[n];
    if (v === undefined || v === null || v === '') return '';
    if (Array.isArray(v)) return v.length + (v.length === 1 ? ' elemento' : ' elementos');
    if (typeof v === 'object') return v.lat ? v.lat.toFixed(5) + ', ' + v.lon.toFixed(5) : '';
    var f = idxCampo[n];
    return f && f.lista ? etiqueta(f, v) : String(v);
  }
  function interpola(t) {
    return esc(t).replace(/\$\{(\w+)\}/g, function (_, n) { return textoValor(n) || '—'; });
  }

  var idxCampo = {};
  E.pasos.forEach(function (p) {
    p.campos.forEach(function (f) {
      idxCampo[f.name] = f;
      (f.subs || []).forEach(function (s) { idxCampo[s.name] = s; });
    });
  });

  // ---------------------------------------------------------------- pasos
  function pasosVisibles() { return E.pasos.filter(visible); }

  // ---------------------------------------------------------------- controles
  function ctlSelectUno(f, val, clase) {
    var ops = opciones(f), h = '';
    if (clase === 'esc') {
      var NOM = { n: 'Ninguno', l: 'Leve', m: 'Moderado', s: 'Severo' };
      ops.forEach(function (o) {
        h += '<button type="button" data-a="uno" data-n="' + esc(f.name) + '" data-v="' + esc(o.v) +
             '" aria-pressed="' + (val === o.v ? 'true' : 'false') + '">' +
             '<span class="g">' + esc(o.l) + '</span><span class="p">' + esc(NOM[o.v] || '') + '</span></button>';
      });
      return '<div class="esc">' + h + '</div>';
    }
    if (clase === 'lista') {
      h = '<option value="">Seleccione…</option>';
      ops.forEach(function (o) {
        h += '<option value="' + esc(o.v) + '"' + (val === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>';
      });
      return '<select class="inp" data-a="sel" data-n="' + esc(f.name) + '">' + h + '</select>';
    }
    ops.forEach(function (o) {
      h += '<button type="button" data-a="uno" data-n="' + esc(f.name) + '" data-v="' + esc(o.v) +
           '" aria-pressed="' + (val === o.v ? 'true' : 'false') + '">' + esc(o.l) + '</button>';
    });
    return '<div class="' + (clase === 'seg' ? 'seg' : 'cards') + '">' + h + '</div>';
  }

  function ctl(f, sub) {
    var n = f.name, val = D[n], u = f.ui, h = '';
    if (val === undefined) val = '';

    if (u === 'segmentado') h = ctlSelectUno(f, val, 'seg');
    else if (u === 'escala') h = ctlSelectUno(f, val, 'esc');
    else if (u === 'tarjetas') h = ctlSelectUno(f, val, 'cards');
    else if (u === 'lista') h = ctlSelectUno(f, val, 'lista');
    else if (u === 'chips') {
      var sel = Array.isArray(val) ? val : [];
      h = '<div class="chips">' + opciones(f).map(function (o) {
        return '<button type="button" data-a="multi" data-n="' + esc(n) + '" data-v="' + esc(o.v) +
               '" aria-pressed="' + (sel.indexOf(o.v) > -1 ? 'true' : 'false') + '">' + esc(o.l) + '</button>';
      }).join('') + '</div>';
    }
    else if (u === 'contador') {
      h = '<div class="cnt"><button type="button" data-a="mas" data-n="' + esc(n) + '" data-d="-1">&minus;</button>' +
          '<input class="inp" type="number" inputmode="numeric" data-a="txt" data-n="' + esc(n) +
          '" value="' + esc(val) + '" placeholder="0">' +
          '<button type="button" data-a="mas" data-n="' + esc(n) + '" data-d="1">+</button></div>';
    }
    else if (u === 'numero') {
      var campo = '<input class="inp" type="number" inputmode="decimal" step="any" data-a="txt" data-n="' +
                  esc(n) + '" value="' + esc(val) + '">';
      h = f.unidad ? '<div class="uni">' + campo + '<span>' + esc(f.unidad) + '</span></div>' : campo;
    }
    else if (u === 'numerico') {
      // cédulas y celulares son cadenas de dígitos, no cantidades: con type="number"
      // se pierden los ceros a la izquierda y la validación por regex deja de cuadrar
      h = '<input class="inp" type="text" inputmode="numeric" pattern="[0-9]*" data-a="txt" data-n="' +
          esc(n) + '" value="' + esc(val) + '">';
    }
    else if (u === 'parrafo') {
      h = '<textarea class="inp" rows="3" data-a="txt" data-n="' + esc(n) + '">' + esc(val) + '</textarea>';
    }
    else if (u === 'fecha') h = '<input class="inp" type="date" data-a="txt" data-n="' + esc(n) + '" value="' + esc(val) + '">';
    else if (u === 'fechahora') h = '<input class="inp" type="datetime-local" data-a="txt" data-n="' + esc(n) + '" value="' + esc(val) + '">';
    else if (u === 'codigo') {
      h = '<input class="inp" type="text" inputmode="text" autocapitalize="characters" data-a="txt" data-n="' +
          esc(n) + '" value="' + esc(val) + '" placeholder="Escriba el c&oacute;digo">';
    }
    else if (u === 'camara') {
      var fotos = Array.isArray(val) ? val : [];
      h = '<div class="cam">' + fotos.map(function (src, i) {
        return '<figure><img src="' + src + '" alt=""><button type="button" class="del" data-a="quitafoto" data-n="' +
               esc(n) + '" data-i="' + i + '" aria-label="Quitar foto">&times;</button></figure>';
      }).join('') +
      '<button type="button" class="add" data-a="foto" data-n="' + esc(n) + '"><b>+</b>' +
      (fotos.length ? 'Otra' : 'Tomar foto') + '</button></div>';
    }
    else if (u === 'gps') {
      h = '<div class="gps"><button type="button" data-a="gps" data-n="' + esc(n) + '">' +
          (val ? 'Volver a ubicar' : 'Obtener ubicaci&oacute;n') + '</button>';
      if (val && val.lat) {
        var buena = val.acc <= 20;
        h += '<div class="fix">' + val.lat.toFixed(6) + ', ' + val.lon.toFixed(6) + '<br>' +
             '<span class="' + (buena ? 'buena' : 'mala') + '">precisi&oacute;n ' + Math.round(val.acc) + ' m' +
             (buena ? ' — suficiente' : ' — espere a que baje de 20 m') + '</span></div>';
      }
      h += '</div>';
    }
    else if (u === 'clave') {
      h = '<input class="inp mono" type="text" spellcheck="false" autocapitalize="off" ' +
          'autocomplete="off" data-a="txt" data-n="' + esc(n) + '" value="' + esc(val) +
          '" placeholder="Pegue aquí la clave">';
    }
    else h = '<input class="inp" type="text" data-a="txt" data-n="' + esc(n) + '" value="' + esc(val) + '">';

    // subcampos que se despliegan dentro del mismo control
    if (!sub && f.subs) {
      f.subs.forEach(function (s) {
        var activo = s.cuando.some(function (c) { return SEL(val, c); });
        if (!activo) return;
        h += '<div class="sub" data-campo="' + esc(s.name) + '">' +
             '<label class="lab">' + esc(s.label) + (s.req ? ' <span class="req">*</span>' : '') + '</label>' +
             (s.ayuda ? '<p class="hint">' + esc(s.ayuda) + '</p>' : '') +
             '<div class="ctl">' + ctl(s, true) + '</div>' +
             '<p class="msg">' + esc(s.vmsg || 'Complete este dato') + '</p></div>';
      });
    }
    // control encadenado (material → sistema) dentro de la misma tarjeta
    if (!sub && f.cadena && idxCampo[f.cadena] && val) {
      var hija = idxCampo[f.cadena];
      h += '<div class="sub" data-campo="' + esc(hija.name) + '">' +
           '<label class="lab">' + esc(hija.label) + (hija.req ? ' <span class="req">*</span>' : '') + '</label>' +
           '<div class="ctl">' + ctl(hija, true) + '</div>' +
           '<p class="msg">' + esc(hija.vmsg || 'Complete este dato') + '</p></div>';
    }
    return h;
  }

  function claseNota(t) {
    var s = t.toUpperCase();
    if (s.indexOf('NO HABITABLE') > -1 || s.indexOf('ROJO') > -1) return ' r';
    if (s.indexOf('USO RESTRINGIDO') > -1 || s.indexOf('AMARILLO') > -1) return ' a';
    if (s.indexOf('HABITABLE') > -1 || s.indexOf('VERDE') > -1) return ' v';
    return '';
  }

  // ---------------------------------------------------------------- pintar paso
  function pintaPaso() {
    var vis = pasosVisibles();
    if (iPaso >= vis.length) return pintaFin();
    var p = vis[iPaso];
    var col = { gen: 'var(--gen)', eval: 'var(--eval)', rep: 'var(--rep)', dem: 'var(--dem)' }[p.mod];
    var top = document.getElementById('top');
    top.hidden = false; document.getElementById('bot').hidden = false;
    top.style.setProperty('--c', col);
    document.getElementById('mod').textContent =
      { gen: 'General', eval: 'Evaluación', rep: 'Reparabilidad', dem: 'Demolición' }[p.mod];
    document.getElementById('titulo').textContent = p.titulo;
    document.getElementById('pasoN').textContent = (iPaso + 1) + '/' + vis.length;
    document.getElementById('barra').style.width = ((iPaso + 1) / vis.length * 100) + '%';

    var h = '';
    p.campos.forEach(function (f) {
      if (f.tipo === 'calc' || f.tipo === 'auto') return;
      if (f.esHija) return;                       // se pinta dentro de su madre
      if (!visible(f)) return;
      if (f.tipo === 'nota') {
        var txt = f.kind === 'vivo' ? interpola(f.texto) : esc(f.texto);
        h += '<div class="nota' + claseNota(f.texto) + '">' + txt.replace(/ \| /g, '<br>') + '</div>';
        return;
      }
      h += '<div class="f" data-campo="' + esc(f.name) + '">' +
           '<label class="lab">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>' +
           (f.ayuda ? '<p class="hint">' + esc(f.ayuda) + '</p>' : '') +
           '<div class="ctl">' + ctl(f) + '</div>' +
           '<p class="msg">' + esc(f.vmsg || 'Complete este dato') + '</p></div>';
    });

    document.getElementById('main').innerHTML = h ||
      '<div class="nota">Este apartado no aplica para esta visita.</div>';
    document.getElementById('bAtras').disabled = iPaso === 0;
    refrescaRed();
    document.getElementById('bSig').textContent = iPaso === vis.length - 1 ? 'Revisar y cerrar' : 'Siguiente';
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- validar
  function pideValor(f) {
    var v = D[f.name];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  }
  function valida() {
    var vis = pasosVisibles(), p = vis[iPaso], malos = [];
    if (!p) return malos;
    function revisa(f, dentro) {
      if (!dentro && !visible(f)) return;
      if (f.req && pideValor(f)) { malos.push([f.name, 'Complete este dato']); return; }
      if (f.valida && !pideValor(f) && ev(f.valida, D[f.name]) === false) {
        malos.push([f.name, f.vmsg || 'Valor fuera del rango permitido']);
      }
    }
    p.campos.forEach(function (f) {
      if (f.tipo === 'calc' || f.tipo === 'auto' || f.tipo === 'nota' || f.esHija) return;
      if (!visible(f)) return;
      revisa(f);
      (f.subs || []).forEach(function (s) {
        if (s.cuando.some(function (c) { return SEL(D[f.name], c); })) revisa(s, true);
      });
      if (f.cadena && D[f.name] && idxCampo[f.cadena]) revisa(idxCampo[f.cadena], true);
    });
    return malos;
  }
  function marca(malos) {
    var main = document.getElementById('main');
    [].forEach.call(main.querySelectorAll('.err, .err-hijo'), function (e) {
      e.classList.remove('err'); e.classList.remove('err-hijo');
    });
    malos.forEach(function (m) {
      var el = main.querySelector('[data-campo="' + m[0] + '"]');
      if (!el) return;
      el.classList.add('err');
      // si el fallo está en un subcampo, la tarjeta que lo contiene también se marca:
      // de lo contrario el botón parece muerto y no se ve dónde está el problema
      var tarjeta = el.closest('.f');
      if (tarjeta && tarjeta !== el) tarjeta.classList.add('err-hijo');
      var msg = el.querySelector('.msg'); if (msg) msg.textContent = m[1];
    });
    if (malos.length) {
      var pr = main.querySelector('.err, .err-hijo');
      if (pr) pr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ---------------------------------------------------------------- guardar
  // Se guarda en cada cambio, con un respiro para no escribir en cada tecla.
  var pendiente = null;
  function guardaVisita(yaMismo) {
    if (!visita) return Promise.resolve();
    visita.D = D; visita.paso = iPaso; visita.resumen = resumenCorto();
    if (pendiente) { clearTimeout(pendiente); pendiente = null; }
    if (yaMismo) return ALMACEN.visitas.guarda(visita);
    pendiente = setTimeout(function () {
      pendiente = null; ALMACEN.visitas.guarda(visita).catch(function () {});
    }, 400);
    return Promise.resolve();
  }
  function resumenCorto() {
    return {
      codigo: D.cod_registro || '', direccion: D.direccion || '',
      municipio: textoValor('municipio'), clasif: D.eva_clasif_habitabilidad || '',
      colapso: D.estado_colapso || '', fotos: cuentaFotos()
    };
  }
  function cuentaFotos() {
    var n = 0;
    Object.keys(D).forEach(function (k) {
      var v = D[k];
      if (Array.isArray(v) && typeof v[0] === 'string' && v[0].slice(0, 5) === 'data:') n += v.length;
    });
    return n;
  }
  function nuevaVisita() {
    visita = { id: 'v' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
               estado: 'borrador', creada: Date.now(), tocada: Date.now(), D: {}, paso: 0 };
    D = {}; iPaso = 0;
    Object.keys(PERFIL).forEach(function (k) { D[k] = PERFIL[k]; });
    recalcula();
    return guardaVisita(true);
  }

  // ---------------------------------------------------------------- pantallas
  function chrome(on) {
    document.getElementById('top').hidden = !on;
    document.getElementById('bot').hidden = !on;
    var m = document.getElementById('marca'); if (m) m.hidden = on;
    var pie = document.getElementById('pie'); if (pie) pie.hidden = on;
  }
  function fechaCorta(ts) {
    return new Date(ts).toLocaleString('es-CO', { day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit' });
  }
  var ETIQ_ESTADO = { borrador: ['b', 'Sin terminar'], lista: ['l', 'Lista para enviar'],
                      enviada: ['e', 'Enviada'] };

  function pintaBandeja() {
    vista = 'bandeja'; chrome(false); visita = null;
    var p = PERFIL.evaluador_nombre;
    ALMACEN.visitas.todas().then(function (todas) {
      // primero lo que queda por hacer, después lo que espera envío, al final lo ya enviado
      var PESO = { borrador: 0, lista: 1, enviada: 2 };
      todas.sort(function (a, b) {
        var d = (PESO[a.estado] || 0) - (PESO[b.estado] || 0);
        return d !== 0 ? d : b.tocada - a.tocada;
      });
      var listas = todas.filter(function (v) { return v.estado === 'lista'; });
      var enviadas = todas.filter(function (v) { return v.estado === 'enviada'; });
      var h = '<div class="pantalla">' + barraRed() +
        '<div class="eyebrow">Evaluación rápida por inspección visual</div>' +
        '<h1>Visita post-sismo</h1>';

      if (!todas.length) {
        h += '<p class="lede">Una edificación por visita. El formulario se adapta a lo que usted' +
             ' responda: solo aparecen los apartados que corresponden. Todo se guarda en el' +
             ' teléfono, sin necesidad de señal.</p>';
      }
      if (!claveEnvio()) {
        h += '<div class="nota a">Falta la <b>clave del equipo</b>. Puede levantar visitas' +
             ' sin ella, pero no se podrán enviar. Se pone en «datos del evaluador».</div>';
      }
      h += '<button class="big" data-a="nueva">Nueva visita</button>';

      if (todas.length) {
        h += '<div class="seccion"><h2>Visitas en el teléfono</h2>' +
             '<span class="cuenta">' + todas.length + '</span></div><div class="lista">';
        todas.forEach(function (v) {
          var e = ETIQ_ESTADO[v.estado] || ETIQ_ESTADO.borrador;
          var r = v.resumen || {};
          var tit = r.codigo || r.direccion || 'Visita sin identificar';
          h += '<div class="fila" data-a="abrir" data-id="' + esc(v.id) + '" role="button" tabindex="0">' +
               '<div class="fila-txt"><b>' + esc(tit) + '</b>' +
               '<span>' + esc([r.direccion !== tit ? r.direccion : '', r.municipio]
                 .filter(Boolean).join(' · ') || fechaCorta(v.tocada)) + '</span></div>' +
               '<div class="fila-meta"><span class="chip ' + e[0] + '">' + e[1] + '</span>' +
               (r.fotos ? '<span class="mini">' + r.fotos + ' foto' + (r.fotos === 1 ? '' : 's') + '</span>' : '') +
               '</div>' +
               '<button class="tirar" data-a="borrar" data-id="' + esc(v.id) +
               '" aria-label="Borrar visita">&times;</button></div>';
        });
        h += '</div>';
      }

      if (listas.length) {
        h += '<button class="big" data-a="enviar">' +
             (CONFIG.endpoint ? 'Enviar' : 'Exportar') + ' ' + listas.length +
             ' visita' + (listas.length === 1 ? '' : 's') + ' lista' + (listas.length === 1 ? '' : 's') + '</button>';
      }
      if (enviadas.length) {
        h += '<button class="big sec" data-a="limpiar">' + (enviadas.length === 1
             ? 'Borrar del teléfono la visita ya enviada'
             : 'Borrar del teléfono las ' + enviadas.length + ' visitas ya enviadas') + '</button>';
      }
      h += '<button class="big sec" data-a="perfil">' + (p ? 'Cambiar' : 'Registrar') +
           ' datos del evaluador</button>' +
           (p ? '<p class="aviso">Evaluador: <b>' + esc(p) + '</b> · ' +
                esc(etiquetaLista('entidad', PERFIL.entidad) || '—') + '</p>' : '') +
           '<p class="aviso" id="espacio"></p></div>';
      document.getElementById('main').innerHTML = h;
      pintaEspacio();
      sincronizaSiPuede();
    });
  }

  function barraRed() {
    var on = navigator.onLine !== false;
    return '<div class="red ' + (on ? 'on' : 'off') + '" id="red">' +
      (on ? 'Con conexión' : 'Sin conexión — puede seguir trabajando, todo se guarda aquí') + '</div>';
  }
  function refrescaRed() {
    var on = navigator.onLine !== false;
    var punto = document.getElementById('sinred');
    if (punto) punto.hidden = on;                 // en el formulario basta un punto
    var el = document.getElementById('red');
    if (!el) return;
    el.className = 'red ' + (on ? 'on' : 'off');
    el.textContent = on ? 'Con conexión'
      : 'Sin conexión — puede seguir trabajando, todo se guarda aquí';
  }
  function pintaEspacio() {
    var el = document.getElementById('espacio'); if (!el) return;
    var base = ALMACEN.conFotos
      ? 'Las respuestas y las fotografías se guardan en este teléfono.'
      : 'Este navegador no permite guardar fotografías sin conexión; las respuestas sí se guardan.';
    ALMACEN.uso().then(function (u) {
      if (!u || !u.cuota) { el.textContent = base; return; }
      var mb = function (b) { return (b / 1048576).toFixed(1); };
      el.textContent = base + ' Ocupado ' + mb(u.usado) + ' MB de ' + mb(u.cuota) + ' MB disponibles.';
    });
  }
  function etiquetaLista(lista, v) {
    var o = (E.listas[lista] || []).filter(function (x) { return x.v === v; })[0];
    return o ? o.l : '';
  }

  var CAMPOS_PERFIL = [
    { name: 'entidad', label: 'Entidad', ui: 'tarjetas', lista: 'entidad', req: true,
      subs: [{ name: 'entidad_otra', label: '¿Cuál entidad?', ui: 'texto', cuando: ['otra'], req: true }] },
    { name: 'evaluador_nombre', label: 'Nombre completo', ui: 'texto', req: true },
    { name: 'evaluador_tipo_doc', label: 'Tipo de documento', ui: 'segmentado', lista: 'tipo_documento', req: true },
    { name: 'evaluador_num_doc', label: 'Número de documento', ui: 'numerico', req: true },
    { name: 'evaluador_profesion', label: 'Profesión', ui: 'tarjetas', lista: 'profesion', req: true,
      subs: [{ name: 'evaluador_profesion_otra', label: '¿Cuál profesión?', ui: 'texto', cuando: ['otra'], req: true }] },
    { name: 'evaluador_matricula', label: 'Matrícula profesional', ui: 'texto', req: false },
    { name: 'clave_dispositivo', label: 'Clave del equipo', ui: 'clave', req: true,
      ayuda: 'La entrega el coordinador al asignar el teléfono. Se guarda aquí y no se ' +
             'vuelve a pedir. Sin ella se puede levantar visitas, pero no enviarlas.' }
  ];
  CAMPOS_PERFIL.forEach(function (f) {
    idxCampo[f.name] = f;
    (f.subs || []).forEach(function (s) { idxCampo[s.name] = s; });
  });

  function pintaPerfil() {
    vista = 'perfil'; chrome(false);
    Object.keys(PERFIL).forEach(function (k) { D[k] = PERFIL[k]; });
    var h = '<div class="pantalla"><div class="eyebrow">Se pide una sola vez</div>' +
      '<h1>Datos del evaluador</h1>' +
      '<p class="lede">Quedan guardados en este teléfono y se aplican a todas las visitas.' +
      ' No hay que repetirlos en cada edificación.</p>';
    CAMPOS_PERFIL.forEach(function (f) {
      h += '<div class="f" data-campo="' + f.name + '">' +
           '<label class="lab">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>' +
           (f.ayuda ? '<p class="hint">' + esc(f.ayuda) + '</p>' : '') +
           '<div class="ctl">' + ctl(f) + '</div><p class="msg">Complete este dato</p></div>';
    });
    h += '<button class="big" data-a="guardaperfil">Guardar y volver</button></div>';
    document.getElementById('main').innerHTML = h;
    window.scrollTo(0, 0);
  }

  function pintaFin() {
    vista = 'fin'; chrome(false);
    recalcula();
    var clas = D.eva_clasif_habitabilidad, colapso = D.estado_colapso;
    var v = { habitable: ['vv', 'Habitable', 'La edificación puede seguir siendo ocupada.'],
              uso_restringido: ['va', 'Uso restringido', 'La ocupación está limitada. Atienda las restricciones indicadas.'],
              no_habitable: ['vr', 'No habitable', 'La edificación NO debe ser ocupada.'] }[clas];
    if (colapso === 'total') v = ['vr', 'Colapso total', 'La edificación está totalmente colapsada.'];
    if (!v) v = ['vn', 'Sin clasificar', 'No se diligenció la evaluación rápida de daños.'];

    // el volumen se calcula siempre, pero solo significa algo si se abrió demolición:
    // sin esta puerta una edificación habitable aparecía con escombros por demoler
    var hayDemolicion = E.pasos.some(function (p) {
      return p.id.indexOf('d') === 0 || p.id === 'c0_estado' ? visible(p) : false;
    });
    var vol = hayDemolicion ? D.volumen_final : '';
    var filas = [
      ['Código de registro', D.cod_registro],
      ['Dirección', D.direccion],
      ['Barrio / Vereda', D.barrio_vereda],
      ['Municipio', textoValor('municipio')],
      ['Fecha y hora', FDT(D.fecha_hora_inspeccion)],
      ['Evaluador', PERFIL.evaluador_nombre],
      ['Nivel de daño', textoValor('eva_nivel_dano')],
      ['Volumen de escombros', vol > 0 ? vol + ' m³' : '']
    ].filter(function (f) { return f[1]; });

    var resp = 0, tot = 0;
    E.pasos.forEach(function (p) {
      if (!visible(p)) return;
      p.campos.forEach(function (f) {
        if (f.tipo === 'calc' || f.tipo === 'auto' || f.tipo === 'nota' || !visible(f)) return;
        tot++; if (!pideValor(f)) resp++;
      });
    });

    var salida = JSON.stringify({ formulario: E.meta.form_id, version: E.meta.version,
      perfil: PERFIL, respuestas: sinFotos() }, null, 1);

    // si el evaluador se apartó de la sugerencia automática, conviene dejarlo dicho
    var sug = D.eva_sugerencia || '';
    var mapa = { habitable: 'HABITABLE (Verde)', uso_restringido: 'USO RESTRINGIDO (Amarillo)',
                 no_habitable: 'NO HABITABLE (Rojo)' };
    var discrepa = clas && sug && sug.indexOf('Complete') === -1 && mapa[clas] !== sug;

    document.getElementById('main').innerHTML =
      '<div class="pantalla"><div class="eyebrow">Resumen de la visita</div>' +
      '<div class="veredicto ' + v[0] + '"><div class="t">' + esc(v[1]) + '</div>' +
      '<div class="d">' + esc(v[2]) + '</div></div>' +
      (discrepa ? '<div class="nota a">El sistema sugería <b>' + esc(sug) + '</b> y usted' +
        ' clasificó distinto. Es su decisión; queda registrada así.</div>' : '') +
      '<div class="res">' + filas.map(function (f) {
        return '<div><span>' + esc(f[0]) + '</span><span>' + esc(f[1]) + '</span></div>';
      }).join('') +
      '<div><span>Respondidas</span><span>' + resp + ' de ' + tot + '</span></div></div>' +
      '<button class="big" data-a="guardarvisita">Guardar y volver a la bandeja</button>' +
      '<p class="aviso">La visita queda en el teléfono marcada como <b>lista para enviar</b>.' +
      ' Puede seguir levantando edificaciones sin señal y enviarlas todas cuando haya red.</p>' +
      '<button class="big sec" data-a="volverpaso">Volver al formulario</button>' +
      '<details class="plegable"><summary>Ver las respuestas en crudo</summary>' +
      '<button class="big sec" data-a="copiar">Copiar respuestas</button>' +
      '<textarea class="json" readonly id="salida">' + esc(salida) + '</textarea></details>' +
      '</div>';
    window.scrollTo(0, 0);
  }
  function sinFotos() {
    var o = {};
    Object.keys(D).forEach(function (k) {
      var val = D[k];
      if (Array.isArray(val) && typeof val[0] === 'string' && val[0].slice(0, 5) === 'data:') {
        o[k] = val.length + ' fotografía(s)';
      } else o[k] = val;
    });
    return o;
  }

  // ---------------------------------------------------------------- fotos
  var destinoFoto = null;
  function achica(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 1280, w = im.width, h = im.height;
        if (w > max || h > max) { var r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.72));
      };
      im.onerror = function () { cb(null); };
      im.src = fr.result;
    };
    fr.onerror = function () { cb(null); };
    fr.readAsDataURL(file);
  }
  var pick = document.getElementById('filePick');
  pick.addEventListener('change', function () {
    var fs = Array.prototype.slice.call(pick.files || []), n = destinoFoto;
    if (!n || !fs.length) return;
    var pend = fs.length;
    fs.forEach(function (file) {
      achica(file, function (url) {
        if (url) { if (!Array.isArray(D[n])) D[n] = []; D[n].push(url); }
        if (--pend === 0) { pick.value = ''; cambio(); }
      });
    });
  });

  // ---------------------------------------------------------------- eventos
  function cambio() {
    recalcula(); guardaVisita();
    if (vista === 'paso') pintaPaso(); else if (vista === 'perfil') pintaPerfil();
  }

  document.getElementById('main').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.dataset.a, n = b.dataset.n;

    if (a === 'uno') {
      // en una obligatoria, volver a tocar la opción elegida no la borra: en campo
      // un roce de más dejaría la respuesta en blanco sin que nadie se entere
      var campo = idxCampo[n];
      if (D[n] === b.dataset.v) { if (campo && campo.req) return; D[n] = ''; }
      else D[n] = b.dataset.v;
      return cambio();
    }
    if (a === 'multi') {
      var arr = Array.isArray(D[n]) ? D[n].slice() : [], i = arr.indexOf(b.dataset.v);
      if (i > -1) arr.splice(i, 1); else arr.push(b.dataset.v);
      D[n] = arr; return cambio();
    }
    if (a === 'mas') {
      var cur = Number(D[n]) || 0, nv = cur + Number(b.dataset.d);
      D[n] = nv < 0 ? 0 : nv; return cambio();
    }
    if (a === 'foto') { destinoFoto = n; pick.click(); return; }
    if (a === 'quitafoto') { D[n].splice(Number(b.dataset.i), 1); return cambio(); }
    if (a === 'gps') {
      if (!navigator.geolocation) { alert('Este teléfono no permite obtener la ubicación.'); return; }
      b.textContent = 'Ubicando…'; b.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        D[n] = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
        cambio();
      }, function () {
        b.disabled = false; b.textContent = 'Reintentar';
        alert('No se pudo obtener la ubicación. Revise que el GPS y el permiso estén activos.');
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      return;
    }
    if (a === 'nueva') {
      return nuevaVisita().then(function () { vista = 'paso'; pintaPaso(); });
    }
    if (a === 'abrir') {
      return ALMACEN.visitas.lee(b.dataset.id).then(function (v) {
        if (!v) return pintaBandeja();
        visita = v; D = v.D || {}; iPaso = v.paso || 0;
        Object.keys(PERFIL).forEach(function (k) { if (!D[k]) D[k] = PERFIL[k]; });
        recalcula(); vista = 'paso'; pintaPaso();
      });
    }
    if (a === 'borrar') {
      e.stopPropagation();
      if (!confirm('¿Borrar esta visita del teléfono? No se puede deshacer.')) return;
      return ALMACEN.visitas.borra(b.dataset.id).then(pintaBandeja);
    }
    if (a === 'enviar') return enviaPendientes(b);
    if (a === 'limpiar') {
      if (!confirm('¿Borrar del teléfono las visitas ya enviadas? Seguirán en el servidor.')) return;
      return ALMACEN.visitas.todas().then(function (t) {
        return Promise.all(t.filter(function (v) { return v.estado === 'enviada'; })
          .map(function (v) { return ALMACEN.visitas.borra(v.id); }));
      }).then(pintaBandeja);
    }
    if (a === 'guardarvisita') {
      visita.estado = 'lista';
      return guardaVisita(true).then(pintaBandeja);
    }
    if (a === 'perfil') return pintaPerfil();
    if (a === 'guardaperfil') {
      var malos = [];
      CAMPOS_PERFIL.forEach(function (f) {
        if (f.req && pideValor(f)) malos.push([f.name, 'Complete este dato']);
        (f.subs || []).forEach(function (s) {
          if (s.req && s.cuando.some(function (c) { return SEL(D[f.name], c); }) && pideValor(s)) {
            malos.push([f.name, 'Complete el dato que falta']);
          }
        });
      });
      if (malos.length) return marca(malos);
      PERFIL = {};
      CAMPOS_PERFIL.forEach(function (f) {
        PERFIL[f.name] = D[f.name];
        (f.subs || []).forEach(function (s) { if (D[s.name]) PERFIL[s.name] = D[s.name]; });
      });
      ALMACEN.perfil.guarda(PERFIL);
      return pintaBandeja();
    }
    if (a === 'copiar') {
      var t = document.getElementById('salida');
      t.select(); t.setSelectionRange(0, 999999);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) {}
      if (navigator.clipboard) { navigator.clipboard.writeText(t.value).catch(function () {}); ok = true; }
      b.textContent = ok ? 'Copiado ✓' : 'Seleccione y copie el texto';
      setTimeout(function () { b.textContent = 'Copiar respuestas'; }, 2200);
      return;
    }
    if (a === 'volverpaso') { vista = 'paso'; iPaso = Math.max(0, pasosVisibles().length - 1); return pintaPaso(); }
    if (a === 'bandeja') { return guardaVisita(true).then(pintaBandeja); }
  });

  document.getElementById('main').addEventListener('input', function (e) {
    var el = e.target; if (el.dataset.a !== 'txt') return;
    var n = el.dataset.n;
    D[n] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    recalcula();
    var f = document.querySelector('.f[data-campo="' + n + '"]');
    if (f) f.classList.remove('err');
  });
  document.getElementById('main').addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.a === 'sel') { D[el.dataset.n] = el.value; return cambio(); }
    if (el.dataset.a === 'txt') { guardaVisita(); if (vista === 'paso') pintaPaso(); }
  });

  document.getElementById('bSig').addEventListener('click', function () {
    var malos = valida();
    if (malos.length) return marca(malos);
    guardaVisita();
    if (iPaso >= pasosVisibles().length - 1) return pintaFin();
    iPaso++; pintaPaso();
  });
  document.getElementById('bAtras').addEventListener('click', function () {
    if (iPaso > 0) { iPaso--; pintaPaso(); }
  });
  // salir al listado sin perder nada: la visita queda como borrador
  document.getElementById('bSalir').addEventListener('click', function () {
    guardaVisita(true).then(pintaBandeja);
  });

  // ---------------------------------------------------------------- envío
  // Se envía de una en una, no todas juntas: con red mala cada visita que llega
  // queda confirmada por su cuenta y no se pierde el trabajo de las demás.
  function enviaUna(v) {
    return fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-clave-dispositivo': claveEnvio() },
      body: JSON.stringify({
        version: E.meta.version,
        visita: { id: v.id, creada: v.creada, perfil: PERFIL, respuestas: v.D }
      })
    }).then(function (r) {
      if (r.status === 401) return r.json().then(function () { return 'clave'; });
      if (!r.ok) return 'fallo';
      return r.json().then(function (j) {
        var res = (j.resultados || [])[0] || {};
        // "ya_estaba" cuenta como enviada: llegó en un intento anterior cuya
        // respuesta se perdió por el camino
        return (res.estado === 'recibida' || res.estado === 'ya_estaba') ? 'ok' : 'fallo';
      });
    }).catch(function () { return 'fallo'; });
  }

  var enviando = false;
  function enviaPendientes(boton) {
    if (enviando) return Promise.resolve();
    var texto = boton ? boton.textContent : '';
    function di(t) { if (boton) boton.textContent = t; }

    return ALMACEN.visitas.todas().then(function (todas) {
      var listas = todas.filter(function (v) { return v.estado === 'lista'; });
      if (!listas.length) return pintaBandeja();
      if (!claveEnvio()) {
        di('Falta la clave del equipo');
        setTimeout(function () { di(texto); }, 2600);
        return;
      }
      if (navigator.onLine === false) {
        di('Sin conexión — siguen en cola');
        setTimeout(function () { di(texto); }, 2400);
        return;
      }
      enviando = true;
      if (boton) boton.disabled = true;

      var hechas = 0, fallos = 0, claveMala = false;
      function siguiente(i) {
        if (i >= listas.length) return null;
        var v = listas[i];
        di('Enviando ' + (i + 1) + ' de ' + listas.length + '…');
        return enviaUna(v).then(function (r) {
          if (r === 'clave') { claveMala = true; return null; }   // no seguir intentando
          if (r === 'ok') {
            hechas++; v.estado = 'enviada';
            return ALMACEN.visitas.guarda(v).then(function () { return siguiente(i + 1); });
          }
          fallos++;
          return siguiente(i + 1);
        });
      }

      return siguiente(0).then(function () {
        enviando = false;
        if (boton) boton.disabled = false;
        if (claveMala) {
          alert('La clave de este teléfono ya no es válida. Nada se ha perdido: las' +
                ' visitas siguen guardadas. Pida una clave nueva antes de reintentar.');
        } else if (fallos) {
          di(hechas + ' enviadas, ' + fallos + ' siguen en cola');
          setTimeout(pintaBandeja, 2200);
          return;
        }
        return pintaBandeja();
      });
    });
  }

  // Al abrir con conexión, se intenta vaciar la cola sin que haya que pedirlo.
  var ultimoIntento = 0;
  function sincronizaSiPuede() {
    if (navigator.onLine === false || enviando) return;
    if (Date.now() - ultimoIntento < 60000) return;
    ALMACEN.visitas.todas().then(function (t) {
      if (!t.some(function (v) { return v.estado === 'lista'; })) return;
      ultimoIntento = Date.now();
      enviaPendientes(document.querySelector('[data-a="enviar"]'));
    });
  }
  function copiaAlPortapapeles(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt).then(function () { return true; })
        .catch(function () { return respaldoCopia(txt); });
    }
    return Promise.resolve(respaldoCopia(txt));
  }
  function respaldoCopia(txt) {
    try {
      var t = document.createElement('textarea');
      t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(t);
      return ok;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------------- conexión
  window.addEventListener('online', function () {
    refrescaRed();
    if (vista === 'bandeja') sincronizaSiPuede();
  });
  window.addEventListener('offline', refrescaRed);
  // guardar antes de que el navegador descarte la página
  window.addEventListener('pagehide', function () { if (visita) guardaVisita(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && visita) guardaVisita(true);
  });

  // ---------------------------------------------------------------- arranque
  if (typeof window !== 'undefined' && window.__TEST__) {
    window.__api = { ev: ev, recalcula: recalcula, visible: visible,
                     set: function (k, v) { D[k] = v; }, get: function (k) { return D[k]; },
                     limpia: function () { Object.keys(D).forEach(function (k) { delete D[k]; }); } };
  }
  PERFIL = ALMACEN.perfil.lee();
  recalcula();
  ALMACEN.listo.then(function () {
    ALMACEN.persiste();          // pedir que el navegador no borre los datos por falta de espacio
    pintaBandeja();
  });
  function enLista(lista, v) {
    var L = E && E.listas && E.listas[lista]; if (!v || !L) return false;
    return L.some(function (o) { return o.v === v; });
  }
  // ---------------------------------------------------------------- prellenado desde la sala de datos
  // visita.html?predio=<NPN 30 dígitos>&dir&barrio&nombre&zona=U|R&lat&lon&manzana&pisos&sotanos&uso&ano&tipo&eva&evaf
  // Crea una visita nueva con el predio ya identificado (código, dirección, barrio, municipio) y abre el formulario.
  // La ubicación GPS la toma el evaluador en sitio; la coordenada del predio queda como referencia.
  (function () {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var npn = (q.get('predio') || '').replace(/\D/g, '');
    if (!npn) return;
    ALMACEN.listo.then(function () {
      return nuevaVisita().then(function () {
        D.unit_Code = npn; D.departamento = '17'; D.municipio = '17001';
        if (q.get('dir')) D.direccion = q.get('dir');
        if (q.get('barrio')) D.barrio_vereda = q.get('barrio');
        if (q.get('nombre')) D.nombre_edificacion = q.get('nombre');
        if (q.get('zona')) D.zona = q.get('zona') === 'R' ? 'rural' : 'urbano';
        var lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon'));
        if (isFinite(lat) && isFinite(lon)) D.predio_lat = lat, D.predio_lon = lon;
        // Datos conocidos del predio (catastro y visitas anteriores). El evaluador los confirma o corrige en sitio.
        if (q.get('manzana')) D.manzana = q.get('manzana');
        var pisos = parseInt(q.get('pisos'), 10), sot = parseInt(q.get('sotanos'), 10);
        if (isFinite(pisos) && pisos >= 0 && pisos <= 200) D.num_pisos = pisos;
        if (isFinite(sot) && sot >= 0 && sot <= 20) D.num_sotanos = sot;
        if (enLista('uso', q.get('uso'))) D.uso = q.get('uso');
        if (enLista('ano_construccion', q.get('ano'))) D.ano_construccion = q.get('ano');
        if (enLista('tipo_edificacion', q.get('tipo'))) D.tipo_edificacion = q.get('tipo');
        if (enLista('habitabilidad', q.get('eva'))) {
          D.eva_previa = 'si'; D.eva_previa_clasif = q.get('eva');
          if (/^\d{4}-\d{2}-\d{2}$/.test(q.get('evaf') || '')) D.eva_previa_fecha = q.get('evaf');
        }
        D.origen_prellenado = 'sala_datos';
        recalcula(); guardaVisita(true);
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        iPaso = 1;                      // el código ya viene del mapa: se arranca en Localización
        vista = 'paso'; pintaPaso();
      });
    });
  })();

})();
