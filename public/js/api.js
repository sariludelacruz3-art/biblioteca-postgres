/** Cliente mínimo de la API REST. Lanza Error con .details (errores por campo) si el servidor rechaza la petición. */
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo contactar con el servidor');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || 'Ocurrió un error inesperado');
    err.details = data?.details;
    throw err;
  }
  return data;
}
