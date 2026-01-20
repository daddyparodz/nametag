import { prisma } from '@/lib/prisma';
import { formatGraphName } from '@/lib/nameUtils';
import { apiResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { getTranslations } from 'next-intl/server';
import { getRelationshipTypeDisplayLabel } from '@/lib/relationship-type-labels';

interface GraphNode {
  id: string;
  label: string;
  groups: string[];
  colors: string[];
  isCenter: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  color: string;
}

interface GraphGroupRef {
  group: { name: string; color: string | null };
}

interface GraphRelationshipType {
  label: string;
  name?: string | null;
  color?: string | null;
  inverse?: { label: string; name?: string | null; color?: string | null } | null;
}

interface GraphRelatedPerson {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  groups: GraphGroupRef[];
  relationshipToUser: { label: string; name?: string | null; color: string | null } | null;
  relationshipsFrom?: GraphSubRelationship[];
}

interface GraphRelationshipFrom {
  relatedPersonId: string;
  relatedPerson: GraphRelatedPerson;
  relationshipType?: GraphRelationshipType | null;
}

interface GraphSubRelationship {
  relatedPersonId: string;
  relationshipType?: GraphRelationshipType | null;
}

export const GET = withAuth(async (_request, session, context) => {
  try {
    const { id } = await context!.params;
    const tRelationshipTypeDefaults = await getTranslations('relationshipTypes.defaults');

    // Fetch the person with all their relationships
    const person = await prisma.person.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        relationshipToUser: {
          where: {
            deletedAt: null,
          },
        },
        groups: {
          where: {
            group: {
              deletedAt: null,
            },
          },
          include: {
            group: true,
          },
        },
        relationshipsFrom: {
          where: {
            deletedAt: null,
            relatedPerson: {
              deletedAt: null,
            },
          },
          include: {
            relatedPerson: {
              include: {
                relationshipToUser: {
                  where: {
                    deletedAt: null,
                  },
                },
                groups: {
                  where: {
                    group: {
                      deletedAt: null,
                    },
                  },
                  include: {
                    group: true,
                  },
                },
                // Fetch relationships between connected people
                relationshipsFrom: {
                  where: {
                    deletedAt: null,
                    relatedPerson: {
                      deletedAt: null,
                    },
                  },
                  include: {
                    relationshipType: {
                      where: {
                        deletedAt: null,
                      },
                      include: {
                        inverse: {
                          where: {
                            deletedAt: null,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            relationshipType: {
              where: {
                deletedAt: null,
              },
              include: {
                inverse: {
                  where: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!person) {
      return apiResponse.notFound('Person not found');
    }

    // Build graph data
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    // Add center node (the person we're viewing)
    nodes.push({
      id: person.id,
      label: formatGraphName(person),
      groups: person.groups.map((pg: { group: { name: string } }) => pg.group.name),
      colors: person.groups.map((pg: { group: { color: string | null } }) => pg.group.color || '#3B82F6'),
      isCenter: true,
    });
    nodeIds.add(person.id);

    // Add user as a node
    const userId = `user-${session.user.id}`;
    nodes.push({
      id: userId,
      label: 'You',
      groups: [],
      colors: [],
      isCenter: false,
    });
    nodeIds.add(userId);

    // Add edge from person to user (their relationship to you) if direct relationship exists
    if (person.relationshipToUser) {
      edges.push({
        source: person.id,
        target: userId,
        type: getRelationshipTypeDisplayLabel(person.relationshipToUser, tRelationshipTypeDefaults),
        color: person.relationshipToUser.color || '#9CA3AF',
      });
    }

    // Add related people as nodes
    person.relationshipsFrom.forEach((rel: GraphRelationshipFrom) => {
      if (!nodeIds.has(rel.relatedPersonId)) {
        nodes.push({
          id: rel.relatedPersonId,
          label: formatGraphName(rel.relatedPerson),
          groups: rel.relatedPerson.groups.map((pg: GraphGroupRef) => pg.group.name),
          colors: rel.relatedPerson.groups.map((pg: GraphGroupRef) => pg.group.color || '#3B82F6'),
          isCenter: false,
        });
        nodeIds.add(rel.relatedPersonId);
      }

      // If the related person has a direct relationship to the user, add that edge
      if (rel.relatedPerson.relationshipToUser) {
        edges.push({
          source: rel.relatedPersonId,
          target: userId,
          type: getRelationshipTypeDisplayLabel(rel.relatedPerson.relationshipToUser, tRelationshipTypeDefaults),
          color: rel.relatedPerson.relationshipToUser.color || '#9CA3AF',
        });
      }
    });

    // Build edges with deduplication (same logic as dashboard)
    const addedEdges = new Set<string>();

    // Add edges from center person to related people
    person.relationshipsFrom.forEach((rel: GraphRelationshipFrom) => {
      if (nodeIds.has(rel.relatedPersonId)) {
        // Use lexicographic ordering to deduplicate bidirectional relationships
        const isSwapped = person.id > rel.relatedPersonId;
        const sourceId = isSwapped ? rel.relatedPersonId : person.id;
        const targetId = isSwapped ? person.id : rel.relatedPersonId;
        const edgeKey = `${sourceId}-${targetId}`;

        // Only add if we haven't already added this edge
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);

          // If we swapped the direction, use the inverse relationship label
          const relationshipLabel = isSwapped && rel.relationshipType?.inverse
            ? getRelationshipTypeDisplayLabel(rel.relationshipType.inverse, tRelationshipTypeDefaults)
            : (rel.relationshipType
              ? getRelationshipTypeDisplayLabel(rel.relationshipType, tRelationshipTypeDefaults)
              : 'Unknown');

          const relationshipColor = isSwapped && rel.relationshipType?.inverse
            ? rel.relationshipType.inverse.color
            : (rel.relationshipType?.color || '#999999');

          edges.push({
            source: sourceId,
            target: targetId,
            type: relationshipLabel,
            color: relationshipColor || '#999999',
          });
        }
      }
    });

    // Add edges between related people (relationships within the network)
    person.relationshipsFrom.forEach((rel: GraphRelationshipFrom) => {
      rel.relatedPerson.relationshipsFrom?.forEach((subRel: GraphSubRelationship) => {
        // Only add edges where both nodes exist in our network
        if (nodeIds.has(subRel.relatedPersonId)) {
          // Use lexicographic ordering to deduplicate bidirectional relationships
          const isSwapped = rel.relatedPersonId > subRel.relatedPersonId;
          const sourceId = isSwapped ? subRel.relatedPersonId : rel.relatedPersonId;
          const targetId = isSwapped ? rel.relatedPersonId : subRel.relatedPersonId;
          const edgeKey = `${sourceId}-${targetId}`;

          // Only add if we haven't already added this edge
          if (!addedEdges.has(edgeKey)) {
            addedEdges.add(edgeKey);

            // If we swapped the direction, use the inverse relationship label
            const relationshipLabel = isSwapped && subRel.relationshipType?.inverse
              ? getRelationshipTypeDisplayLabel(subRel.relationshipType.inverse, tRelationshipTypeDefaults)
              : (subRel.relationshipType
                ? getRelationshipTypeDisplayLabel(subRel.relationshipType, tRelationshipTypeDefaults)
                : 'Unknown');

            const relationshipColor = isSwapped && subRel.relationshipType?.inverse
              ? subRel.relationshipType.inverse.color
              : (subRel.relationshipType?.color || '#999999');

            edges.push({
              source: sourceId,
              target: targetId,
              type: relationshipLabel,
              color: relationshipColor || '#999999',
            });
          }
        }
      });
    });

    return apiResponse.ok({ nodes, edges });
  } catch (error) {
    return handleApiError(error, 'people-graph');
  }
});
