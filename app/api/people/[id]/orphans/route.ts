import { prisma } from '@/lib/prisma';
import { formatFullName } from '@/lib/nameUtils';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';

// GET /api/people/[id]/orphans - Check which people would become orphans if this person is deleted
export const GET = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context!.params;

    // Verify the person exists and belongs to the current user
    const person = await prisma.person.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    // Get all people related to this person (both directions)
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { personId: id },
          { relatedPersonId: id },
        ],
      },
      include: {
        person: {
          include: {
            relationshipToUser: true,
          },
        },
        relatedPerson: {
          include: {
            relationshipToUser: true,
          },
        },
      },
    });

    // Get unique person IDs related to this person
    const relatedPersonIds = new Set<string>();
    relationships.forEach((rel: { personId: string; relatedPersonId: string | null }) => {
      if (rel.personId === id && rel.relatedPersonId) {
        relatedPersonIds.add(rel.relatedPersonId);
      }
      if (rel.relatedPersonId === id && rel.personId) {
        relatedPersonIds.add(rel.personId);
      }
    });

    // For each related person, check if they would become orphans
    const potentialOrphans = [];

    for (const relatedPersonId of relatedPersonIds) {
      // Get all relationships for this related person
      const relatedPersonRelationships = await prisma.relationship.findMany({
        where: {
          OR: [
            { personId: relatedPersonId },
            { relatedPersonId: relatedPersonId },
          ],
        },
      });

      // Count relationships excluding the one with the person being deleted
      const otherRelationships = relatedPersonRelationships.filter(
        (rel: { personId: string; relatedPersonId: string | null }) =>
          rel.personId !== id && rel.relatedPersonId !== id
      );

      // Check if this person has a direct relationship to the user
      const relatedPerson = await prisma.person.findUnique({
        where: { id: relatedPersonId },
        select: {
          id: true,
          name: true,
          surname: true,
          nickname: true,
          relationshipToUser: true, // Include the actual relation to check if it's soft-deleted
        },
      });

      // A person becomes an orphan if:
      // 1. They have no direct relationship to the user (or it's soft-deleted)
      // 2. After deleting this person, they would have no other relationships
      if (relatedPerson && !relatedPerson.relationshipToUser && otherRelationships.length === 0) {
        potentialOrphans.push({
          id: relatedPerson.id,
          fullName: formatFullName(relatedPerson),
        });
      }
    }

    return apiResponse.ok({ orphans: potentialOrphans });
  } catch (error) {
    return handleApiError(error, 'people-orphans');
  }
});
