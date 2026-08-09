// Security utility helpers for masking PII and fuzzing coordinates

function maskEmail(email) {
  if (!email) return '';
  var parts = email.split('@');
  if (parts.length !== 2) return email;
  var local = parts[0];
  var domain = parts[1];
  var visible = local.slice(0, 2);
  return visible + '****@' + domain;
}

function maskPhone(phone) {
  if (!phone) return '';
  if (phone.length <= 4) return '****';
  return phone.slice(0, 2) + '****' + phone.slice(-2);
}

function fuzzCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return coords;
  return [Math.round(coords[0] * 1000) / 1000, Math.round(coords[1] * 1000) / 1000];
}

module.exports = { maskEmail, maskPhone, fuzzCoordinates };
