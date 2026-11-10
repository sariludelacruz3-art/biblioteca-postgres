const { HttpError } = require('./errors');

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida y normaliza el cuerpo de una petición según una lista de campos.
 * Lanza HttpError(400) con el detalle por campo si algo es incorrecto.
 */
function validate(body, fields) {
  const src = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};

  for (const f of fields) {
    let v = src[f.name];
    if (typeof v === 'string') v = v.trim();
    const empty = v === undefined || v === null || v === '';

    if (empty) {
      if (f.required) errors[f.name] = `${f.label} es obligatorio`;
      values[f.name] = f.default !== undefined ? f.default : null;
      continue;
    }

    switch (f.type) {
      case 'text':
      case 'email':
        if (typeof v !== 'string') { errors[f.name] = `${f.label} debe ser texto`; break; }
        if (f.max && v.length > f.max) errors[f.name] = `${f.label} no puede superar ${f.max} caracteres`;
        else if (f.type === 'email' && !EMAIL.test(v)) errors[f.name] = `${f.label} no tiene un formato válido`;
        else if (f.pattern && !f.pattern.test(v)) errors[f.name] = f.patternMsg || `${f.label} no es válido`;
        values[f.name] = v;
        break;
      case 'int': {
        const n = Number(v);
        if (!Number.isInteger(n)) errors[f.name] = `${f.label} debe ser un número entero`;
        else if (f.min !== undefined && n < f.min) errors[f.name] = `${f.label} debe ser como mínimo ${f.min}`;
        else if (f.max !== undefined && n > f.max) errors[f.name] = `${f.label} debe ser como máximo ${f.max}`;
        values[f.name] = n;
        break;
      }
      case 'bool':
        values[f.name] = v === true || v === 'true';
        break;
      case 'date': {
        const d = new Date(`${v}T00:00:00Z`);
        if (typeof v !== 'string' || !DATE.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v)
          errors[f.name] = `${f.label} debe ser una fecha válida (AAAA-MM-DD)`;
        values[f.name] = v;
        break;
      }
      default:
        values[f.name] = v;
    }
  }

  if (Object.keys(errors).length) {
    throw new HttpError(400, 'Hay datos que corregir', errors);
  }
  return values;
}

module.exports = { validate };
