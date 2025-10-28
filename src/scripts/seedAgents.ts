import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';

async function run() {
  if (!env.mongoUri) {
    console.error('Please set MONGODB_URI in .env before running the seed.');
    process.exit(1);
  }
  await connectDB();

  const password = 'admin12345';
  const passwordHash = await hashPassword(password);

  const agents = [
    { 
      email: 'agent@mairie.gouv.sn', 
      role: 'mairie' as const, 
      name: 'Agent Mairie',
      firstName: 'Agent',
      lastName: 'Mairie',
      phone: '+221771111111',
      address: 'Mairie de Dakar'
    },
    { 
      email: 'agent@hopital.gouv.sn', 
      role: 'hopital' as const, 
      name: 'Agent Hopital',
      firstName: 'Agent',
      lastName: 'Hopital',
      phone: '+221772222222',
      address: 'Hôpital Principal de Dakar'
    },
  ];

  for (const a of agents) {
    const existing = await User.findOne({ email: a.email });
    if (existing) {
      existing.role = a.role as any;
      if (!existing.passwordHash) existing.passwordHash = passwordHash;
      if (!existing.firstName) existing.firstName = a.firstName;
      if (!existing.lastName) existing.lastName = a.lastName;
      if (!existing.phone) existing.phone = a.phone;
      if (!existing.address) existing.address = a.address;
      existing.isVerified = true;  // Les agents sont automatiquement vérifiés
      await existing.save();
      console.log(`Updated: ${a.email}`);
    } else {
      await User.create({ 
        email: a.email, 
        role: a.role as any, 
        name: a.name, 
        firstName: a.firstName,
        lastName: a.lastName,
        phone: a.phone,
        address: a.address,
        passwordHash,
        isVerified: true  // Les agents sont automatiquement vérifiés
      });
      console.log(`Created: ${a.email}`);
    }
  }

  console.log('Seed done. Credentials:');
  console.log('Mairie -> agent@mairie.gouv.sn / admin12345');
  console.log('Hopital -> agent@hopital.gouv.sn / admin12345');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
