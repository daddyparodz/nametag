import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Default relationship types configuration
const DEFAULT_RELATIONSHIP_TYPES = [
  { name: 'PARENT', label: 'Parent', color: '#F59E0B', inverseName: 'CHILD' },
  { name: 'CHILD', label: 'Child', color: '#F59E0B', inverseName: 'PARENT' },
  { name: 'GRANDPARENT', label: 'Grandparent', color: '#F97316', inverseName: 'GRANDCHILD' },
  { name: 'GRANDCHILD', label: 'Grandchild', color: '#FB923C', inverseName: 'GRANDPARENT' },
  { name: 'AUNT_UNCLE', label: 'Aunt/Uncle', color: '#A855F7', inverseName: 'NIECE_NEPHEW' },
  { name: 'NIECE_NEPHEW', label: 'Niece/Nephew', color: '#D946EF', inverseName: 'AUNT_UNCLE' },
  { name: 'COUSIN', label: 'Cousin', color: '#0EA5E9', inverseName: 'COUSIN' },
  { name: 'STEP_PARENT', label: 'Step-Parent', color: '#EF4444', inverseName: 'STEP_CHILD' },
  { name: 'STEP_CHILD', label: 'Step-Child', color: '#F43F5E', inverseName: 'STEP_PARENT' },
  { name: 'PARENT_IN_LAW', label: 'Parent-in-Law', color: '#22C55E', inverseName: 'CHILD_IN_LAW' },
  { name: 'CHILD_IN_LAW', label: 'Child-in-Law', color: '#16A34A', inverseName: 'PARENT_IN_LAW' },
  { name: 'SIBLING_IN_LAW', label: 'Sibling-in-Law', color: '#06B6D4', inverseName: 'SIBLING_IN_LAW' },
  { name: 'SIBLING', label: 'Sibling', color: '#8B5CF6', inverseName: 'SIBLING' },
  { name: 'SPOUSE', label: 'Spouse', color: '#EC4899', inverseName: 'SPOUSE' },
  { name: 'PARTNER', label: 'Partner', color: '#EC4899', inverseName: 'PARTNER' },
  { name: 'FRIEND', label: 'Friend', color: '#3B82F6', inverseName: 'FRIEND' },
  { name: 'COLLEAGUE', label: 'Colleague', color: '#10B981', inverseName: 'COLLEAGUE' },
  { name: 'ACQUAINTANCE', label: 'Acquaintance', color: '#14B8A6', inverseName: 'ACQUAINTANCE' },
  { name: 'OTHER', label: 'Other', color: '#6B7280', inverseName: 'OTHER' },
];

async function createDefaultRelationshipTypes(userId: string, userEmail: string) {
  console.log(`  Ensuring default relationship types for user: ${userEmail}`);

  const legacyRelativeUsage = await Promise.all([
    prisma.person.count({
      where: { userId, relationshipToUser: { name: 'RELATIVE' } },
    }),
    prisma.relationship.count({
      where: { person: { userId }, relationshipType: { name: 'RELATIVE' } },
    }),
  ]);

  if (legacyRelativeUsage.some((count) => count > 0)) {
    console.log('  Skipping legacy RELATIVE type deletion (still in use)');
  } else {
    await prisma.relationshipType.deleteMany({
      where: { userId, name: 'RELATIVE' },
    });
  }

  const existingTypes = await prisma.relationshipType.findMany({
    where: { userId },
    select: { id: true, name: true, inverseId: true, color: true },
  });

  const typeMap = new Map<string, { id: string; inverseId: string | null; color: string | null }>();
  for (const type of existingTypes) {
    typeMap.set(type.name, { id: type.id, inverseId: type.inverseId, color: type.color });
  }

  let createdCount = 0;

  // Create missing types
  for (const type of DEFAULT_RELATIONSHIP_TYPES) {
    if (typeMap.has(type.name)) {
      continue;
    }

    const created = await prisma.relationshipType.create({
      data: {
        userId,
        name: type.name,
        label: type.label,
        color: type.color,
      },
    });
    typeMap.set(type.name, { id: created.id, inverseId: null, color: created.color });
    createdCount++;
  }

  // Set inverse relationships where not set
  for (const type of DEFAULT_RELATIONSHIP_TYPES) {
    const current = typeMap.get(type.name);
    const inverse = typeMap.get(type.inverseName);

    if (!current || !inverse || current.inverseId) {
      continue;
    }

    await prisma.relationshipType.update({
      where: { id: current.id },
      data: { inverseId: inverse.id },
    });
  }

  const legacyFamilyColor = '#F59E0B';
  const familyTypesNeedingColorUpdate = new Set([
    'GRANDPARENT',
    'GRANDCHILD',
    'AUNT_UNCLE',
    'NIECE_NEPHEW',
    'COUSIN',
    'STEP_PARENT',
    'STEP_CHILD',
    'PARENT_IN_LAW',
    'CHILD_IN_LAW',
    'SIBLING_IN_LAW',
  ]);

  for (const type of DEFAULT_RELATIONSHIP_TYPES) {
    const current = typeMap.get(type.name);
    if (!current || current.color === type.color) {
      continue;
    }

    const shouldUpdateColor =
      !current.color ||
      (familyTypesNeedingColorUpdate.has(type.name) && current.color === legacyFamilyColor);

    if (!shouldUpdateColor) {
      continue;
    }

    await prisma.relationshipType.update({
      where: { id: current.id },
      data: { color: type.color },
    });
    current.color = type.color;
  }

  if (createdCount > 0) {
    console.log(`  Created ${createdCount} relationship type(s)`);
  } else {
    console.log('  Default relationship types already present');
  }
}

async function main() {
  console.log('Starting production seed - relationship types...\n');

  // Find all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      relationshipTypes: {
        select: { id: true },
      },
    },
  });

  if (users.length === 0) {
    console.log('No users found in database. Relationship types will be created when users register.');
    return;
  }

  console.log(`Found ${users.length} user(s) in database\n`);

  let processedCount = 0;

  // Process each user
  for (const user of users) {
    await createDefaultRelationshipTypes(user.id, user.email);
    processedCount++;
  }

  console.log('\nProduction seed completed!');
  console.log(`Users processed: ${processedCount}`);
  console.log(`\nEnsured default relationship types for ${processedCount} user(s)`);
}

main()
  .catch((e) => {
  console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


