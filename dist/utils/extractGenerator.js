import dayjs from 'dayjs';
import { STAMP_AMOUNT_FCFA } from '../config/constants.js';
export function generateExtractHTML(data) {
    const dateStr = dayjs(data.child.birthDate).format('DD/MM/YYYY');
    const paidStr = dayjs(data.paidAt).format('DD/MM/YYYY HH:mm');
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Extrait de Naissance - République du Sénégal</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; position: relative; }
    .header { text-align: center; }
    .watermark { position: fixed; top: 40%; left: 10%; font-size: 80px; color: rgba(0,0,0,0.05); transform: rotate(-20deg); z-index: -1; }
    .section { margin-top: 20px; }
    .label { font-weight: bold; }
    .badge { display: inline-block; padding: 4px 8px; border: 1px solid #ccc; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="watermark">CIVILE-APP</div>
  <div class="header">
    <h2>République du Sénégal</h2>
    <h3>Extrait d'Acte de Naissance</h3>
  </div>

  <div class="section">
    <div><span class="label">Enfant:</span> ${data.child.lastName.toUpperCase()} ${data.child.firstName}</div>
    <div><span class="label">Né(e) le:</span> ${dateStr} à ${data.child.birthPlace}</div>
    <div><span class="label">Sexe:</span> ${data.child.sex}</div>
  </div>

  <div class="section">
    <div><span class="label">Mère:</span> ${(data.mother.lastName || '').toUpperCase()} ${data.mother.firstName || ''}</div>
    <div><span class="label">Père:</span> ${(data.father.lastName || '').toUpperCase()} ${data.father.firstName || ''}</div>
  </div>

  <div class="section">
    <div><span class="label">Identifiant de déclaration:</span> ${data.declarationId}</div>
    <div><span class="label">Timbre payé:</span> ${STAMP_AMOUNT_FCFA} FCFA le ${paidStr}</div>
    <div class="badge">Document officiel - Téléchargement unique</div>
  </div>
</body>
</html>`;
}
