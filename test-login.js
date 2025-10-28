// Script de test pour la connexion
const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testLogin(identifier, password) {
  try {
    console.log(`\n🔍 Test de connexion avec: ${identifier}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      identifier,
      password
    });
    
    console.log('✅ Succès!');
    console.log('Utilisateur connecté:', response.data.user.email);
    return true;
  } catch (error) {
    console.log('❌ Erreur:', error.response?.data?.message || error.message);
    return false;
  }
}

// Exemples de tests
async function runTests() {
  // 1. Test avec email
  await testLogin('test@example.com', 'password123');
  
  // 2. Test avec numéro international
  await testLogin('+221771234567', 'password123');
  
  // 3. Test sans l'indicatif
  await testLogin('771234567', 'password123');
  
  // 4. Test avec espaces
  await testLogin('+221 77 123 45 67', 'password123');
  
  // 5. Test avec tirets
  await testLogin('77-123-45-67', 'password123');
}

runTests();
