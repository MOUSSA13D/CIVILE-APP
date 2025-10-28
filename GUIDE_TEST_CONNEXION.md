# Guide de Test de Connexion

## 1. Prérequis

- Node.js installé
- Serveur en cours d'exécution (`npm run dev`)
- Un compte parent créé (via `/auth/register`)

## 2. Formats de numéros acceptés

Vous pouvez vous connecter avec ces formats :
- `+221771234567` (format international)
- `771234567` (sans l'indicatif)
- `+221 77 123 45 67` (avec espaces)
- `77-123-45-67` (avec tirets)

## 3. Tester avec cURL

### Connexion avec email :
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "test@example.com", "password": "password123"}'
```

### Connexion avec téléphone :
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "771234567", "password": "password123"}'
```

## 4. Tester avec le script

1. Installez axios :
```bash
npm install axios
```

2. Exécutez le test :
```bash
node test-login.js
```

## 5. Résolution des problèmes

Si la connexion échoue :
1. Vérifiez les logs du serveur pour voir le numéro stocké
2. Assurez-vous que le compte est vérifié
3. Vérifiez le mot de passe

## 6. Exemple de réponse réussie

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "phone": "+221771234567",
    "isVerified": true
  }
}
```

## 7. Erreurs courantes

- `Identifiants invalides` : Mauvais email/téléphone ou mot de passe
- `Compte non vérifié` : Vérifiez votre boîte mail/SMS pour le code
- `Champs manquants` : Email/téléphone ou mot de passe manquant
