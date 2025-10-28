const bcrypt = require('bcrypt');

const password = 'password123';
const hash = '$2a$10$QTC6RVvrokZuxWlbzb0QvedNFSIljGJEmcRgRCRGOc2AaUnMTGttW';

async function testPassword() {
  const match = await bcrypt.compare(password, hash);
  console.log('Le mot de passe est correct ?', match);
}

testPassword();
