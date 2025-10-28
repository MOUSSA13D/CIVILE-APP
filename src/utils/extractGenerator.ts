import dayjs from 'dayjs';
import { STAMP_AMOUNT_FCFA } from '../config/constants.js';

interface Person {
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  birthPlace?: string;
  sex?: 'M' | 'F';
  [key: string]: any; // Pour les propriétés supplémentaires
}

export function generateExtractHTML(data: {
  child: Person;
  mother: Person;
  father: Person;
  declarationId: string;
  paidAt: Date;
}): string {
  // Fonction utilitaire pour formater les noms en toute sécurité
  const formatName = (person: Person) => {
    if (!person) return 'Non spécifié';
    const lastName = person.lastName ? person.lastName.toUpperCase() : '';
    const firstName = person.firstName || '';
    return `${lastName} ${firstName}`.trim() || 'Non spécifié';
  };

  // Formater les dates avec gestion des valeurs manquantes
  const formatDate = (date?: Date) => {
    return date ? dayjs(date).format('DD/MM/YYYY') : 'Date non spécifiée';
  };

  const dateStr = data.child?.birthDate ? formatDate(data.child.birthDate) : 'Date de naissance inconnue';
  const paidStr = data.paidAt ? dayjs(data.paidAt).format('DD/MM/YYYY HH:mm') : 'Date de paiement inconnue';
  const birthPlace = data.child?.birthPlace || 'Lieu de naissance non spécifié';
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
    <div><span class="label">Enfant:</span> ${formatName(data.child)}</div>
    <div><span class="label">Né(e) le:</span> ${dateStr} à ${birthPlace}</div>
    <div><span class="label">Sexe:</span> ${data.child?.sex || 'Non spécifié'}</div>
  </div>

  <div class="section">
    <div><span class="label">Mère:</span> ${formatName(data.mother)}</div>
    <div><span class="label">Père:</span> ${formatName(data.father)}</div>
  </div>

  <div class="section">
    <div><span class="label">Identifiant de déclaration:</span> ${data.declarationId}</div>
    <div><span class="label">Timbre payé:</span> ${STAMP_AMOUNT_FCFA} FCFA le ${paidStr}</div>
    <div class="badge">Document officiel - Téléchargement unique</div>
  </div>
</body>
</html>`;
}
