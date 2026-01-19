import { prisma as prismaClient } from './prisma';

// Type that accepts the extended prisma client
type PrismaClientLike = typeof prismaClient;

/**
 * Pre-loaded relationship types that are created for every new user.
 * Each user gets their own copy of these types that they can modify or delete.
 */
export const PRELOADED_RELATIONSHIP_TYPES = [
  { name: 'PARENT', label: 'Parent', color: '#F59E0B', inverseName: 'CHILD' },
  { name: 'CHILD', label: 'Child', color: '#F59E0B', inverseName: 'PARENT' },
  { name: 'GRANDPARENT', label: 'Grandparent', color: '#F97316', inverseName: 'GRANDCHILD' },
  { name: 'GRANDCHILD', label: 'Grandchild', color: '#FB923C', inverseName: 'GRANDPARENT' },
  { name: 'AUNT_UNCLE', label: 'Aunt/Uncle', color: '#A855F7', inverseName: 'NIECE_NEPHEW' },
  { name: 'NIECE_NEPHEW', label: 'Niece/Nephew', color: '#D946EF', inverseName: 'AUNT_UNCLE' },
  { name: 'COUSIN', label: 'Cousin', color: '#0EA5E9', symmetric: true },
  { name: 'STEP_PARENT', label: 'Step-Parent', color: '#EF4444', inverseName: 'STEP_CHILD' },
  { name: 'STEP_CHILD', label: 'Step-Child', color: '#F43F5E', inverseName: 'STEP_PARENT' },
  { name: 'PARENT_IN_LAW', label: 'Parent-in-Law', color: '#22C55E', inverseName: 'CHILD_IN_LAW' },
  { name: 'CHILD_IN_LAW', label: 'Child-in-Law', color: '#16A34A', inverseName: 'PARENT_IN_LAW' },
  { name: 'SIBLING_IN_LAW', label: 'Sibling-in-Law', color: '#06B6D4', symmetric: true },
  { name: 'SIBLING', label: 'Sibling', color: '#8B5CF6', symmetric: true },
  { name: 'SPOUSE', label: 'Spouse', color: '#EC4899', symmetric: true },
  { name: 'PARTNER', label: 'Partner', color: '#EC4899', symmetric: true },
  { name: 'FRIEND', label: 'Friend', color: '#3B82F6', symmetric: true },
  { name: 'COLLEAGUE', label: 'Colleague', color: '#10B981', symmetric: true },
  { name: 'ACQUAINTANCE', label: 'Acquaintance', color: '#14B8A6', symmetric: true },
  { name: 'OTHER', label: 'Other', color: '#6B7280', symmetric: true },
] as const;

/**
 * Creates the pre-loaded relationship types for a user.
 * This should be called when a new user is created.
 */
export async function createPreloadedRelationshipTypes(
  prisma: PrismaClientLike,
  userId: string
): Promise<void> {
  // Create a map to store created type IDs
  const typeIdMap = new Map<string, string>();

  // First pass: create all types without inverse relationships
  for (const typeConfig of PRELOADED_RELATIONSHIP_TYPES) {
    const createdType = await prisma.relationshipType.create({
      data: {
        userId,
        name: typeConfig.name,
        label: typeConfig.label,
        color: typeConfig.color,
      },
    });
    typeIdMap.set(typeConfig.name, createdType.id);
  }

  // Second pass: set up inverse relationships
  for (const typeConfig of PRELOADED_RELATIONSHIP_TYPES) {
    const typeId = typeIdMap.get(typeConfig.name);
    if (!typeId) continue;

    let inverseId: string | undefined;

    if ('symmetric' in typeConfig && typeConfig.symmetric) {
      // Symmetric types point to themselves
      inverseId = typeId;
    } else if ('inverseName' in typeConfig && typeConfig.inverseName) {
      // Asymmetric types point to their inverse
      inverseId = typeIdMap.get(typeConfig.inverseName);
    }

    if (inverseId) {
      await prisma.relationshipType.update({
        where: { id: typeId },
        data: { inverseId },
      });
    }
  }
}
