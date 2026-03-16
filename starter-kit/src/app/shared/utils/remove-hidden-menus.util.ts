export function removeHiddenMenus(items: any[]): any[] {
  const result: any[] = [];

  for (const item of items) {
    if (item.hidden) {
      continue;
    }

    const clone = { ...item };

    if (clone.children && Array.isArray(clone.children)) {
      clone.children = removeHiddenMenus(clone.children);
    }

    result.push(clone);
  }

  return result;
}