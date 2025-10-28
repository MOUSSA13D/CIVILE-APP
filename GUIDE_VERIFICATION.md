# Guide de vérification de compte

## Vue d'ensemble

Le système de vérification de compte permet de s'assurer que les parents qui s'inscrivent possèdent bien l'email et le numéro de téléphone qu'ils ont fournis.

## Fonctionnement

### 1. Inscription

Lorsqu'un parent s'inscrit via **POST /auth/register**, le système :
- ✅ Crée le compte avec `isVerified: false`
- 📧 Génère un code à 6 chiffres (ex: `123456`)
- 📨 Envoie le code par **email**
- 📱 Envoie le code par **SMS**
- ⏰ Le code expire dans **15 minutes**

**Réponse :**
```json
{
  "message": "Inscription réussie. Veuillez vérifier votre compte avec le code reçu par email/SMS.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "parent@example.com",
    "isVerified": false
  }
}
```

### 2. Vérification du compte

Le parent doit vérifier son compte avec **POST /auth/verify** :

```json
{
  "email": "parent@example.com",
  "code": "123456"
}
```

**Réponse en cas de succès :**
```json
{
  "message": "Compte vérifié avec succès",
  "user": {
    "id": "...",
    "email": "parent@example.com",
    "isVerified": true
  }
}
```

### 3. Renvoyer un code

Si le code a expiré ou n'a pas été reçu, utiliser **POST /auth/resend-code** :

```json
{
  "email": "parent@example.com"
}
```

**Réponse :**
```json
{
  "message": "Nouveau code de vérification envoyé par email et SMS"
}
```

## Restrictions

### Connexion bloquée sans vérification

⚠️ **IMPORTANT** : Les parents ne peuvent **PAS se connecter** sans vérifier leur compte.

Si un parent essaie de se connecter sans avoir vérifié son compte, il reçoit :
```json
{
  "message": "Compte non vérifié. Veuillez vérifier votre compte avec le code reçu par email/SMS avant de vous connecter.",
  "isVerified": false,
  "email": "parent@example.com"
}
```

**Exception** : Les agents mairie et hôpital peuvent se connecter sans vérification (ils sont automatiquement vérifiés lors de leur création).

### Routes protégées

Les routes suivantes nécessitent un compte **vérifié** :
- ✅ **POST /auth/login** - Connexion (pour les parents uniquement)
- ✅ **POST /declarations** - Créer une déclaration

## Configuration pour la production

### Email (Nodemailer)

1. Installez Nodemailer :
```bash
npm install nodemailer
```

2. Ajoutez dans `.env` :
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

3. Modifiez `src/utils/verification.ts` pour décommenter le code d'envoi d'email.

### SMS (Twilio)

1. Créez un compte sur [Twilio](https://www.twilio.com/)

2. Installez le SDK :
```bash
npm install twilio
```

3. Ajoutez dans `.env` :
```
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

4. Modifiez `src/utils/verification.ts` pour décommenter le code d'envoi SMS.

## Mode développement

En développement, les codes sont affichés dans les **logs du serveur** :

```
📧 [EMAIL] Envoi du code 123456 à parent@example.com
📱 [SMS] Envoi du code 123456 au +221771234567
```

Vous pouvez récupérer le code directement dans le terminal PowerShell.

## Workflow complet

```
1. Parent s'inscrit
   ↓
2. Code envoyé par email/SMS
   ↓
3. Parent vérifie son compte avec le code
   ↓
4. isVerified = true
   ↓
5. Parent peut créer des déclarations
```

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /auth/register | Inscription + envoi du code |
| POST | /auth/verify | Vérifier le compte avec le code |
| POST | /auth/resend-code | Renvoyer un nouveau code |
| POST | /auth/login | Connexion (pas besoin d'être vérifié) |

## Test sur Swagger

1. **S'inscrire** : POST /auth/register
2. **Regarder les logs** du serveur pour voir le code
3. **Vérifier** : POST /auth/verify avec l'email et le code
4. **Créer une déclaration** : POST /declarations (maintenant autorisé)

## Base de données

Nouveaux champs dans `users` :
```javascript
{
  isVerified: false,              // Compte vérifié ?
  verificationCode: "123456",     // Code à 6 chiffres
  verificationCodeExpires: Date   // Date d'expiration (15 min)
}
```

Après vérification :
```javascript
{
  isVerified: true,
  verificationCode: undefined,
  verificationCodeExpires: undefined
}
```
