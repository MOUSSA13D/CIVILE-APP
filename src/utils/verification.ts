import crypto from 'crypto';

/**
 * Génère un code de vérification à 6 chiffres
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Calcule la date d'expiration du code (15 minutes)
 */
export function getVerificationCodeExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}

/**
 * Envoie un SMS avec le code de vérification
 * @param phone - Numéro de téléphone
 * @param code - Code de vérification
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<void> {
  // TODO: Intégrer avec un service SMS (Twilio, etc.)
  console.log(`📱 [SMS] Envoi du code ${code} au ${phone}`);
  console.log(`📱 [SMS] Message: Votre code de vérification CIVILE-APP est: ${code}`);
  
  // Pour le développement, on simule l'envoi
  // En production, utiliser un service comme Twilio:
  /*
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
  
  await client.messages.create({
    body: `Votre code de vérification CIVILE-APP est: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
  */
}

/**
 * Envoie un email avec le code de vérification
 * @param email - Adresse email
 * @param name - Nom de l'utilisateur
 * @param code - Code de vérification
 */
export async function sendVerificationEmail(email: string, name: string, code: string): Promise<void> {
  // En mode développement, on affiche simplement l'email dans la console
  const separator = '='.repeat(80);
  
  console.log(`
${separator}`);
  console.log('📧 EMAIL DE VÉRIFICATION (mode développement)');
  console.log(separator);
  console.log(`À: ${name} <${email}>`);
  console.log(`Sujet: Votre code de vérification CIVILE-APP`);
  console.log(separator);
  console.log(`Bonjour ${name},\n`);
  console.log(`Votre code de vérification est : \x1b[1m${code}\x1b[0m`);
  console.log('Ce code est valable 15 minutes.\n');
  console.log('Si vous n\'avez pas demandé ce code, veuillez ignorer cet email.\n');
  console.log('Cordialement,');
  console.log('L\'équipe CIVILE-APP');
  console.log(separator);
  console.log('[FIN DU MESSAGE]\n');
  
  // Pour le développement, on simule l'envoi
  // En production, utiliser un service comme Nodemailer:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Code de vérification CIVILE-APP',
    html: `
      <h1>Bienvenue sur CIVILE-APP</h1>
      <p>Bonjour ${name},</p>
      <p>Votre code de vérification est: <strong>${code}</strong></p>
      <p>Ce code expire dans 15 minutes.</p>
    `
  });
  */
}
