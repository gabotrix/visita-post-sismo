// Recibe una visita de la app móvil "Visita post-sismo".
//
// verify_jwt va en false a propósito: la app no tiene sesión de Supabase. La
// autenticación es una clave de dispositivo compartida que se comprueba aquí
// abajo. Las tablas tienen RLS sin políticas, así que esta función es la única
// forma de escribir: dentro usa el service_role, que nunca sale al teléfono.
//
// De la clave solo se guarda el SHA-256 en public.claves_acceso. Aquí se hashea
// la que llega y se busca una activa con rol "dispositivo" que coincida: una
// clave del panel no puede escribir, ni al revés. Si no hay ninguna
// clave activa, la función rechaza todo: es preferible que no reciba nada a que
// reciba de cualquiera.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-clave-dispositivo",
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

function esFoto(v: unknown): v is string[] {
  return Array.isArray(v) && typeof v[0] === "string" && v[0].startsWith("data:image/");
}

function decodifica(dataUrl: string): { bytes: Uint8Array; tipo: string } | null {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, tipo: m[1] };
  } catch {
    return null;
  }
}

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
const txt = (v: unknown) => (typeof v === "string" && v !== "" ? v.slice(0, 500) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responde({ error: "Solo POST" }, 405);

  const recibida = req.headers.get("x-clave-dispositivo") ?? "";
  if (recibida.length < 20) {
    return responde({ error: "Falta la clave de dispositivo" }, 401);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const hash = await sha256(recibida);
  const { data: clave } = await db
    .from("claves_acceso")
    .select("id, nombre")
    .eq("hash", hash)
    .eq("rol", "dispositivo")
    .eq("activa", true)
    .maybeSingle();

  if (!clave) {
    console.warn("clave rechazada desde", req.headers.get("x-forwarded-for"));
    return responde({ error: "Clave de dispositivo inválida o revocada" }, 401);
  }
  db.from("claves_acceso").update({ ultimo_uso: new Date().toISOString() })
    .eq("id", clave.id).then(() => {});

  let cuerpo: any;
  try {
    cuerpo = await req.json();
  } catch {
    return responde({ error: "Cuerpo no es JSON válido" }, 400);
  }

  const entrantes: any[] = cuerpo.visita ? [cuerpo.visita]
    : Array.isArray(cuerpo.visitas) ? cuerpo.visitas : [];
  if (!entrantes.length) return responde({ error: "No llegó ninguna visita" }, 400);
  if (entrantes.length > 20) return responde({ error: "Máximo 20 visitas por envío" }, 413);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const agente = (req.headers.get("user-agent") ?? "").slice(0, 300);
  const resultados: Record<string, string>[] = [];

  for (const v of entrantes) {
    const idDispositivo = txt(v?.id);
    if (!idDispositivo) { resultados.push({ id: String(v?.id), estado: "sin_id" }); continue; }

    const R = (v.respuestas ?? {}) as Record<string, unknown>;
    const P = (v.perfil ?? {}) as Record<string, unknown>;
    const ubi = R.ubicacion as { lat?: number; lon?: number; acc?: number } | undefined;

    // las fotos salen del JSON: van a Storage y en su lugar queda la ruta
    const fotos: { campo: string; orden: number; bytes: Uint8Array; tipo: string }[] = [];
    const respuestas: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(R)) {
      if (!esFoto(val)) { respuestas[k] = val; continue; }
      const rutas: string[] = [];
      val.forEach((d, i) => {
        const f = decodifica(d);
        if (!f) return;
        fotos.push({ campo: k, orden: i, bytes: f.bytes, tipo: f.tipo });
        rutas.push(`${idDispositivo}/${k}-${i}`);
      });
      respuestas[k] = rutas;
    }

    const fila = {
      id_dispositivo: idDispositivo,
      creada_en: v.creada ? new Date(v.creada).toISOString() : new Date().toISOString(),
      evaluador_nombre: txt(P.evaluador_nombre),
      evaluador_documento: txt(P.evaluador_num_doc),
      entidad: txt(P.entidad),
      codigo_registro: txt(R.cod_registro),
      direccion: txt(R.direccion),
      barrio_vereda: txt(R.barrio_vereda),
      municipio: txt(R.municipio),
      departamento: txt(R.departamento),
      lat: num(ubi?.lat),
      lon: num(ubi?.lon),
      precision_gps: num(ubi?.acc),
      estado_colapso: txt(R.estado_colapso),
      habitabilidad: txt(R.eva_clasif_habitabilidad),
      nivel_dano: txt(R.eva_nivel_dano),
      num_pisos: num(R.num_pisos),
      volumen_escombros: num(R.volumen_final),
      respuestas,
      version_formulario: txt(cuerpo.version) ?? txt(v.version),
      clave_id: clave.id,
      ip_origen: ip,
      agente,
    };

    // Si ya estaba, no se duplica ni se pisa: el reintento de una red mala es
    // indistinguible de un envío nuevo, y la primera versión es la buena.
    const { data, error } = await db
      .from("visitas")
      .insert(fila)
      .select("id")
      .maybeSingle();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        resultados.push({ id: idDispositivo, estado: "ya_estaba" });
        continue;
      }
      console.error("insert falló", idDispositivo, error.message);
      resultados.push({ id: idDispositivo, estado: "error", detalle: error.message });
      continue;
    }

    const visitaId = data!.id as string;
    let subidas = 0;
    for (const f of fotos) {
      const ext = f.tipo === "image/png" ? "png" : f.tipo === "image/webp" ? "webp" : "jpg";
      const ruta = `${idDispositivo}/${f.campo}-${f.orden}.${ext}`;
      const { error: eS } = await db.storage
        .from("fotos-visitas")
        .upload(ruta, f.bytes, { contentType: f.tipo, upsert: true });
      if (eS) { console.error("foto falló", ruta, eS.message); continue; }
      await db.from("visita_fotos").insert({
        visita_id: visitaId, campo: f.campo, orden: f.orden,
        ruta, bytes: f.bytes.length,
      });
      subidas++;
    }

    resultados.push({
      id: idDispositivo, estado: "recibida",
      visita: visitaId, fotos: String(subidas) + "/" + String(fotos.length),
    });
  }

  const fallaron = resultados.filter((r) => r.estado === "error").length;
  return responde({ resultados }, fallaron ? 207 : 200);
});
