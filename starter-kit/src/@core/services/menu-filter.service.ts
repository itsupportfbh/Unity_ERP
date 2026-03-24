import { CoreMenu } from '@core/types';

function hasApprovalAccess(item: any, approvalLevelNames: string[]): boolean {
  if (!item?.approvalRoles || item.approvalRoles.length === 0) {
    return true;
  }

  return item.approvalRoles.some((role: string) =>
    approvalLevelNames.includes(role)
  );
}

export function filterMenuTree(
  menus: CoreMenu[],
  allowedMenuIds: string[],
  approvalLevelNames: string[] = [],
  parentAllowed: boolean = false
): CoreMenu[] {
  if (!menus || menus.length === 0) return [];

  return menus
    .map((item: any) => {
      const selfAllowed = parentAllowed || allowedMenuIds.includes(item.id);

      const filteredChildren = item.children?.length
        ? filterMenuTree(
            item.children,
            allowedMenuIds,
            approvalLevelNames,
            selfAllowed
          )
        : [];

      const roleAllowed = hasApprovalAccess(item, approvalLevelNames);

      // Optional: Super Admin-ku Department Menu Access always show pannalaam
      const superAdminExtraAccess =
        item.id === 'department-menu-access' &&
        approvalLevelNames.includes('Super Admin');

      const finalAllowed =
        roleAllowed &&
        (selfAllowed || filteredChildren.length > 0 || superAdminExtraAccess);

      if (!finalAllowed) return null;

      return {
        ...item,
        children: filteredChildren
      };
    })
    .filter((x): x is CoreMenu => x !== null);
}