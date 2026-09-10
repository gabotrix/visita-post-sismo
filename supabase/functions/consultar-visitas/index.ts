// Lectura para el panel de la alcaldía.
//
// Igual que la de escritura: verify_jwt en false porque no hay sesión de
// Supabase, y la autenticación es una clave cuyo SHA-256 vive en
// public.claves_acceso. Aquí se exige rol 'panel': una clave de teléfono no
// puede consultar nada, aunque la roben de un aparato.
//
// El listado sale de la vista visitas_listado, que no incluye los datos de
// contacto del propietario. Esos solo aparecen al abrir una visita concreta.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-clave-panel",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responde(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function csv(filas: Record<string, unknown>[]): string {
  if (!filas.length) return "";
  const cols = Object.keys(filas[0]);
  const celda = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  // separador ';' y BOM explícito: sin el BOM, Excel en español abre los
  // acentos rotos. Se escribe con fromCharCode para que no lo pierda el
  // transporte al desplegar la función.
  return String.fromCharCode(0xFEFF) + [cols.join(";")]
    .concat(filas.map((f) => cols.map((c) => celda(f[c])).join(";")))
    .join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responde({ error: "Solo POST" }, 405);

  const recibida = req.headers.get("x-clave-panel") ?? "";
  if (recibida.length < 20) return responde({ error: "Falta la clave del panel" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: clave } = await db
    .from("claves_acceso")
    .select("id, nombre")
    .eq("hash", await sha256(recibida))
    .eq("rol", "panel")
    .eq("activa", true)
    .maybeSingle();

  if (!clave) {
    console.warn("clave de panel rechazada desde", req.headers.get("x-forwarded-for"));
    return responde({ error: "Clave inválida o revocada" }, 401);
  }
  db.from("claves_acceso").update({ ultimo_uso: new Date().toISOString() })
    .eq("id", clave.id).then(() => {});

  let cuerpo: any = {};
  try { cuerpo = await req.json(); } catch { /* sin cuerpo: se asume resumen */ }
  const accion = cuerpo.accion ?? "resumen";

  // ---------------------------------------------------------------- resumen
  if (accion === "resumen") {
    const { data, error } = await db.rpc("panel_resumen");
    if (error) return responde({ error: error.message }, 500);
    return responde({ panel: clave.nombre, ...data });
  }

  // ---------------------------------------------------------------- listado
  if (accion === "lista" || accion === "csv") {
    let q = db.from("visitas_listado").select("*").order("recibida_en", { ascending: false });
    if (cuerpo.municipio) q = q.eq("municipio", cuerpo.municipio);
    if (cuerpo.habitabilidad) q = q.eq("habitabilidad", cuerpo.habitabilidad);
    if (cuerpo.colapso) q = q.eq("estado_colapso", cuerpo.colapso);
    if (cuerpo.busca) {
      const b = String(cuerpo.busca).replace(/[%,]/g, " ").trim();
      if (b) q = q.or(`codigo_registro.ilike.%${b}%,direccion.ilike.%${b}%,barrio_vereda.ilike.%${b}%`);
    }
    q = q.limit(accion === "csv" ? 10000 : Math.min(Number(cuerpo.limite) || 500, 2000));

    const { data, error } = await q;
    if (error) return responde({ error: error.message }, 500);

    if (accion === "csv") {
      return new Response(csv(data ?? []), {
        headers: { ...CORS, "Content-Type": "text/csv; charset=utf-8" },
      });
    }
    return responde({ visitas: data ?? [] });
  }

  // ---------------------------------------------------------------- detalle
  if (accion === "detalle") {
    const id = String(cuerpo.id ?? "");
    if (!id) return responde({ error: "Falta el id" }, 400);

    const { data: v, error } = await db
      .from("visitas").select("*").eq("id", id).maybeSingle();
    if (error) return responde({ error: error.message }, 500);
    if (!v) return responde({ error: "No existe esa visita" }, 404);

    const { data: fotos } = await db
      .from("visita_fotos").select("campo, orden, ruta, bytes")
      .eq("visita_id", id).order("campo").order("orden");

    // URL firmada de 10 minutos: el bucket es privado y no se abre a nadie más
    const conUrl = [];
    for (const f of fotos ?? []) {
      const { data: s } = await db.storage
        .from("fotos-visitas").createSignedUrl(f.ruta, 600);
      conUrl.push({ ...f, url: s?.signedUrl ?? null });
    }
    return responde({ visita: v, fotos: conUrl });
  }


  // ---------------------------------------------------------------- corregir
  // Solo estas columnas. El resto del formulario no se toca desde el panel:
  // lo que respondió el evaluador en campo se queda como lo dejó.
  const EDITABLES: Record<string, string> = {
    codigo_registro: "cod_registro",
    direccion: "direccion",
    barrio_vereda: "barrio_vereda",
    municipio: "municipio",
    habitabilidad: "eva_clasif_habitabilidad",
    nivel_dano: "eva_nivel_dano",
    estado_colapso: "estado_colapso",
    num_pisos: "num_pisos",
    volumen_escombros: "volumen_final",
  };

  if (accion === "corregir") {
    const id = String(cuerpo.id ?? "");
    const motivo = String(cuerpo.motivo ?? "").trim();
    const cambios = (cuerpo.cambios ?? {}) as Record<string, unknown>;
    if (!id) return responde({ error: "Falta el id" }, 400);
    if (motivo.length < 5) {
      return responde({ error: "Hace falta un motivo de al menos 5 caracteres" }, 400);
    }

    const { data: v } = await db.from("visitas").select("*").eq("id", id).maybeSingle();
    if (!v) return responde({ error: "No existe esa visita" }, 404);

    const parche: Record<string, unknown> = {};
    const respuestas = { ...(v.respuestas ?? {}) } as Record<string, unknown>;
    const bitacora = [];

    for (const [col, valor] of Object.entries(cambios)) {
      if (!(col in EDITABLES)) continue;
      const antes = (v as Record<string, unknown>)[col];
      const nuevoV = valor === "" ? null : valor;
      if (String(antes ?? "") === String(nuevoV ?? "")) continue;
      parche[col] = nuevoV;
      // el JSON completo se mantiene de acuerdo con la columna, para que el
      // CSV y el detalle no se contradigan entre sí
      respuestas[EDITABLES[col]] = nuevoV;
      bitacora.push({
        visita_id: id, clave_id: clave.id, campo: col,
        antes: antes === null || antes === undefined ? null : String(antes),
        despues: nuevoV === null ? null : String(nuevoV),
        motivo,
      });
    }

    if (!bitacora.length) return responde({ error: "No hay ningún cambio" }, 400);

    parche.respuestas = respuestas;
    parche.corregida_en = new Date().toISOString();
    const { error: eU } = await db.from("visitas").update(parche).eq("id", id);
    if (eU) return responde({ error: eU.message }, 500);
    await db.from("visita_correcciones").insert(bitacora);

    return responde({ corregidos: bitacora.length, campos: bitacora.map((b) => b.campo) });
  }

  // ---------------------------------------------------------------- borrar
  if (accion === "borrar") {
    const id = String(cuerpo.id ?? "");
    const motivo = String(cuerpo.motivo ?? "").trim();
    if (!id) return responde({ error: "Falta el id" }, 400);
    if (motivo.length < 5) {
      return responde({ error: "Hace falta un motivo de al menos 5 caracteres" }, 400);
    }

    const { data: fotos } = await db.from("visita_fotos").select("ruta").eq("visita_id", id);
    const rutas = (fotos ?? []).map((f) => f.ruta as string);

    // primero los archivos: si se borra la fila antes y falla el Storage, los
    // archivos quedan huérfanos y ya no hay forma de saber a quién pertenecían
    let borradas = 0;
    if (rutas.length) {
      const { error: eS } = await db.storage.from("fotos-visitas").remove(rutas);
      if (eS) return responde({ error: "No se pudieron borrar las fotos: " + eS.message }, 500);
      borradas = rutas.length;
    }
    console.warn("visita borrada", id, "por", clave.nombre, "motivo:", motivo);
    const { error } = await db.from("visitas").delete().eq("id", id);
    if (error) return responde({ error: error.message }, 500);
    return responde({ borrada: id, fotos: borradas });
  }

  // ---------------------------------------------------------------- purgar
  // Archivos en Storage que ya no reclama ninguna visita.
  if (accion === "purgar") {
    const { data: h, error } = await db.from("fotos_huerfanas").select("ruta").limit(500);
    if (error) return responde({ error: error.message }, 500);
    const rutas = (h ?? []).map((x) => x.ruta as string);
    if (!rutas.length) return responde({ purgadas: 0 });
    const { error: eS } = await db.storage.from("fotos-visitas").remove(rutas);
    if (eS) return responde({ error: eS.message }, 500);
    console.warn("purgadas", rutas.length, "fotos huérfanas por", clave.nombre);
    return responde({ purgadas: rutas.length });
  }

  // ---------------------------------------------------------------- bitácora
  if (accion === "correcciones") {
    const { data, error } = await db
      .from("visita_correcciones")
      .select("campo, antes, despues, motivo, creada_en")
      .eq("visita_id", String(cuerpo.id ?? ""))
      .order("creada_en", { ascending: false });
    if (error) return responde({ error: error.message }, 500);
    return responde({ correcciones: data ?? [] });
  }

  return responde({ error: "Acción desconocida: " + accion }, 400);
});
