export function filterMenuTreeByIds(menus: any[], allowedIds: string[]): any[] {
  const allowed = new Set(allowedIds || []);

  const mapRecursive = (items: any[]): any[] => {
    const result: any[] = [];

    for (const item of items) {
      const clone = { ...item };

      if (clone.children && Array.isArray(clone.children)) {
        clone.children = mapRecursive(clone.children);
      }

      const selfAllowed = allowed.has(clone.id);
      const hasChildren = clone.children && clone.children.length > 0;

      if (selfAllowed || hasChildren) {
        result.push(clone);
      }
    }

    return result;
  };

  return mapRecursive(menus);
}