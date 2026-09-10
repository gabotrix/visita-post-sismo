/* Prueba del motor de expresiones contra las expresiones reales del formulario */
const fs = require('fs');
const vm = require('vm');

// ---- DOM minimo para poder cargar app.js fuera del navegador
function nodo() {
  return { hidden: false, disabled: false, value: '', textContent: '', innerHTML: '',
           files: [], dataset: {}, style: { setProperty() {}, width: '' },
           addEventListener() {}, click() {}, querySelector: () => null,
           querySelectorAll: () => [], scrollIntoView() {}, select() {}, setSelectionRange() {} };
}
const almacen = {};
const sandbox = {
  window: {}, console,
  document: { getElementById: nodo, querySelector: () => null, querySelectorAll: () => [],
              createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => '' }) },
  localStorage: { getItem: k => almacen[k] || null, setItem: (k, v) => { almacen[k] = v; },
                  removeItem: k => { delete almacen[k]; } },
  navigator: { onLine: true }, FileReader: function () {}, Image: function () {},
  alert() {}, setTimeout: (f) => f && f(), clearTimeout() {},
  addEventListener() {}, fetch: () => Promise.reject('sin red'),
  Promise, JSON, Math, Date, Object, Array, String, Number, RegExp, Error, isNaN,
};
sandbox.document.addEventListener = function () {};
sandbox.window = sandbox;
sandbox.window.__TEST__ = true;
sandbox.window.ESQUEMA = JSON.parse(fs.readFileSync('esquema.json', 'utf8'));
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('almacen.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('app.js', 'utf8'), sandbox);

const api = sandbox.window.__api;
const E = sandbox.window.ESQUEMA;

// ---- recolectar todas las expresiones del esquema
const exprs = [];
const add = (t, o, campo) => { if (o && o[campo]) exprs.push({ t, n: o.name || o.id, x: o[campo] }); };
E.pasos.forEach(p => {
  add('paso.relevant', p, 'relevant');
  p.campos.forEach(f => {
    add('relevant', f, 'relevant'); add('calc', f, 'calc');
    add('valida', f, 'valida'); add('filtro', f, 'filtro');
    (f.subs || []).forEach(s => { add('sub.valida', s, 'valida'); });
  });
});

let fallos = [];
exprs.forEach(e => {
  if (e.t === 'filtro') return;                       // el filtro no pasa por el compilador
  const r = api.ev(e.x, 5);
  if (r === null) fallos.push(e);
});

console.log('expresiones evaluadas :', exprs.filter(e => e.t !== 'filtro').length);
console.log('que devuelven null    :', fallos.length);
fallos.slice(0, 12).forEach(f => console.log('   [' + f.t + '] ' + f.n + '  ::  ' + f.x));

// ---- recorrido real: simular una visita y ver que las ramas se abren bien
function ruta(datos, etiqueta) {
  api.limpia();
  Object.keys(datos).forEach(k => api.set(k, datos[k]));
  api.recalcula();
  const vis = E.pasos.filter(p => api.visible(p));
  console.log('\n' + etiqueta);
  console.log('   pasos visibles: ' + vis.length + '  ->  ' + vis.map(p => p.id).join(' '));
  return vis.map(p => p.id);
}

const base = { estado_colapso: 'ninguno', inclinacion: 'no', gate_evaluacion: 'si',
  eva_tipo_inspeccion: 'completa', eva_tipo_amenaza: 'sismo', eva_riesgo_adyacentes: 'no',
  eva_licuacion: 'no', eva_mov_masa: 'no',
  eva_dano_columnas: 'n', eva_dano_muros_portantes: 'n', eva_dano_vigas: 'n',
  eva_dano_nodos: 'n', eva_dano_riostras: 'n', eva_dano_entrepiso: 'n' };

const verde = ruta({ ...base, eva_clasif_habitabilidad: 'habitable' }, 'A. Verde (habitable)');
const amar = ruta({ ...base, eva_clasif_habitabilidad: 'uso_restringido', rep_demoler: 'no' },
                  'B. Amarillo (uso restringido, sin demoler)');
const amarD = ruta({ ...base, eva_clasif_habitabilidad: 'uso_restringido', rep_demoler: 'si',
                     esc_retirados: 'no' }, 'C. Amarillo que termina en demolicion');
const rojo = ruta({ ...base, eva_clasif_habitabilidad: 'no_habitable', esc_retirados: 'no' },
                  'D. Rojo (no habitable)');
const total = ruta({ estado_colapso: 'total', esc_retirados: 'no' }, 'E. Colapso total');
const sinEval = ruta({ estado_colapso: 'ninguno', gate_evaluacion: 'no',
                       modulo_continuar: 'reparabilidad', rep_demoler: 'no' },
                     'F. Sin evaluacion, va a reparabilidad');

// ---- comprobaciones de la ruta
const tiene = (r, pre) => r.some(id => id.startsWith(pre));
const pruebas = [
  ['verde no abre reparabilidad', !tiene(verde, 'b')],
  ['verde no abre demolicion', !tiene(verde, 'c') && !tiene(verde, 'd')],
  ['amarillo abre reparabilidad', tiene(amar, 'b')],
  ['amarillo sin demoler no abre demolicion', !tiene(amarD.length ? amar : amar, 'd2')],
  ['amarillo que demuele si abre demolicion', tiene(amarD, 'd2') || tiene(amarD, 'c0')],
  ['rojo abre demolicion', tiene(rojo, 'c0')],
  ['rojo no abre reparabilidad', !tiene(rojo, 'b')],
  ['colapso total no abre evaluacion', !tiene(total, 'a')],
  ['colapso total no abre reparabilidad', !tiene(total, 'b')],
  ['colapso total abre escombros', total.indexOf('d3_escombros') > -1],
  ['colapso total no abre demolicion parcial', total.indexOf('d2_demolicion') === -1],
  ['sin evaluacion abre reparabilidad', tiene(sinEval, 'b')],
  ['sin evaluacion no abre el modulo A', !tiene(sinEval, 'a')],
  ['la pregunta de desaparecidos sobrevive al colapso total',
    total.indexOf('c0_estado') > -1],
];
console.log('\n=== RUTA ===');
let mal = 0;
pruebas.forEach(([n, ok]) => { if (!ok) mal++; console.log((ok ? '  ok   ' : '  FALLA ') + n); });

// ---- la sugerencia de habitabilidad
console.log('\n=== SUGERENCIA AUTOMATICA ===');
[['todo ninguno', {}, 'HABITABLE (Verde)'],
 ['una columna moderada', { eva_dano_columnas: 'm' }, 'USO RESTRINGIDO (Amarillo)'],
 ['una viga severa', { eva_dano_vigas: 's' }, 'NO HABITABLE (Rojo)'],
 ['licuacion del terreno', { eva_licuacion: 'si' }, 'USO RESTRINGIDO (Amarillo)'],
 ['inclinacion evidente', { inclinacion: 'si' }, 'NO HABITABLE (Rojo)'],
].forEach(([et, extra, esperado]) => {
  api.limpia();
  Object.keys({ ...base, ...extra }).forEach(k => api.set(k, { ...base, ...extra }[k]));
  api.recalcula();
  const got = api.get('eva_sugerencia');
  const ok = got === esperado;
  if (!ok) mal++;
  console.log((ok ? '  ok   ' : '  FALLA ') + et + ' -> ' + got);
});

// ---- el volumen de escombros por los dos caminos
console.log('\n=== VOLUMEN ===');
api.limpia();
['num_pisos', 'dim_frente', 'dim_fondo'].forEach((k, i) => api.set(k, [3, 10, 8][i]));
api.set('estado_colapso', 'parcial');
api.recalcula();
const volDem = api.get('dem_volumen');
const okDem = Math.abs(volDem - 187.2) < 0.01;      // 3 x 80 x 2,6 x 0,3
if (!okDem) mal++;
console.log((okDem ? '  ok   ' : '  FALLA ') + 'demolicion parcial: ' + volDem + ' m3 (esperado 187.2)');

api.limpia();
api.set('estado_colapso', 'total'); api.set('esc_area', 120); api.set('esc_altura', 2.5);
api.recalcula();
const volEsc = api.get('volumen_final');
const okEsc = Math.abs(volEsc - 300) < 0.01;
if (!okEsc) mal++;
console.log((okEsc ? '  ok   ' : '  FALLA ') + 'colapso total: ' + volEsc + ' m3 (esperado 300)');

console.log('\n' + (mal || fallos.length ? '>>> ' + (mal + fallos.length) + ' PROBLEMA(S)' : '>>> todo en orden'));
process.exit(mal || fallos.length ? 1 : 0);
