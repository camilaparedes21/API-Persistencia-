// Configuración de la visibilidad de comentarios.



const DEFAULT_MAX_MONTHS = 6;

function getCommentMaxMonths() {
  const raw = process.env.COMMENT_MAX_AGE_MONTHS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_MAX_MONTHS;

  const months = Number(raw);
  if (!Number.isInteger(months) || months < 0) {
    console.warn(
      `[config] COMMENT_MAX_AGE_MONTHS="${raw}" no es un entero >= 0. ` +
        `Se usa el valor por defecto (${DEFAULT_MAX_MONTHS}).`
    );
    return DEFAULT_MAX_MONTHS;
  }
  return months;
}

// Devuelve la fecha límite: los comentarios con fecha >= a este valor son visibles.
// Resta meses "de calendario" y ajusta el día cuando el mes destino es más corto
function getVisibilityCutoff(now = new Date()) {
  const months = getCommentMaxMonths();
  const cutoff = new Date(now.getTime());
  const day = cutoff.getDate();

  cutoff.setDate(1); // evita el desborde de días al cambiar de mes
  cutoff.setMonth(cutoff.getMonth() - months);

  const lastDayOfTargetMonth = new Date(
    cutoff.getFullYear(),
    cutoff.getMonth() + 1,
    0
  ).getDate();
  cutoff.setDate(Math.min(day, lastDayOfTargetMonth));

  return cutoff;
}

function isCommentVisible(commentDate, now = new Date()) {
  if (!commentDate) return true;
  return new Date(commentDate) >= getVisibilityCutoff(now);
}

module.exports = {
  DEFAULT_MAX_MONTHS,
  getCommentMaxMonths,
  getVisibilityCutoff,
  isCommentVisible,
};
