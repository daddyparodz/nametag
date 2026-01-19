export const DEFAULT_RELATIONSHIP_TYPE_LABELS = {
  PARENT: 'Parent',
  CHILD: 'Child',
  GRANDPARENT: 'Grandparent',
  GRANDCHILD: 'Grandchild',
  AUNT_UNCLE: 'Aunt/Uncle',
  NIECE_NEPHEW: 'Niece/Nephew',
  COUSIN: 'Cousin',
  STEP_PARENT: 'Step-Parent',
  STEP_CHILD: 'Step-Child',
  PARENT_IN_LAW: 'Parent-in-Law',
  CHILD_IN_LAW: 'Child-in-Law',
  SIBLING_IN_LAW: 'Sibling-in-Law',
  SIBLING: 'Sibling',
  SPOUSE: 'Spouse',
  PARTNER: 'Partner',
  FRIEND: 'Friend',
  COLLEAGUE: 'Colleague',
  ACQUAINTANCE: 'Acquaintance',
  OTHER: 'Other',
} as const;

export const DEFAULT_RELATIONSHIP_TYPE_KEYS = {
  PARENT: 'parent',
  CHILD: 'child',
  GRANDPARENT: 'grandparent',
  GRANDCHILD: 'grandchild',
  AUNT_UNCLE: 'auntUncle',
  NIECE_NEPHEW: 'nieceNephew',
  COUSIN: 'cousin',
  STEP_PARENT: 'stepParent',
  STEP_CHILD: 'stepChild',
  PARENT_IN_LAW: 'parentInLaw',
  CHILD_IN_LAW: 'childInLaw',
  SIBLING_IN_LAW: 'siblingInLaw',
  SIBLING: 'sibling',
  SPOUSE: 'spouse',
  PARTNER: 'partner',
  FRIEND: 'friend',
  COLLEAGUE: 'colleague',
  ACQUAINTANCE: 'acquaintance',
  OTHER: 'other',
} as const;

type DefaultRelationshipTypeName = keyof typeof DEFAULT_RELATIONSHIP_TYPE_LABELS;

export function getRelationshipTypeDisplayLabel(
  type: { name?: string | null; label: string },
  t?: (key: string) => string
): string {
  if (!type?.name) {
    return type.label;
  }

  const normalizedName = type.name.toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_RELATIONSHIP_TYPE_LABELS, normalizedName)) {
    return type.label;
  }

  const defaultLabel = DEFAULT_RELATIONSHIP_TYPE_LABELS[normalizedName as DefaultRelationshipTypeName];
  if (type.label !== defaultLabel) {
    return type.label;
  }

  if (!t) {
    return type.label;
  }

  const key = DEFAULT_RELATIONSHIP_TYPE_KEYS[normalizedName as DefaultRelationshipTypeName];
  return t(key);
}
