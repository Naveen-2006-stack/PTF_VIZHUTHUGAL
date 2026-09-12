/**
 * Determines whether a navigation item is currently active based on pathname.
 *
 * Requirements:
 * 1. Exact match: if pathname === itemHref, it's active.
 * 2. Separate pages with shared path prefixes (e.g. /attendance vs /attendance/abdul-kalam)
 *    must never both be highlighted. When on /attendance/abdul-kalam, ONLY /attendance/abdul-kalam
 *    is active, NOT /attendance.
 * 3. Supports route alias: /attendance/history activates the /attendance item.
 * 4. Nested routes: A route like /admin/students/123 activates /admin/students,
 *    provided no other nav item in the sidebar has a more specific (longer) match.
 * 5. Dashboard (/dashboard) requires exact match.
 */
export function isNavItemActive(
  itemHref: string,
  pathname: string,
  allItemHrefs: string[] = []
): boolean {
  if (!pathname || !itemHref) return false;

  // Clean trailing slashes for consistency (unless root '/')
  const cleanPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const cleanHref = itemHref.length > 1 && itemHref.endsWith('/') ? itemHref.slice(0, -1) : itemHref;

  // 1. Direct exact match
  if (cleanPath === cleanHref) {
    return true;
  }

  // 2. Attendance history alias: /attendance/history matches /attendance
  if (cleanHref === '/attendance' && (cleanPath === '/attendance/history' || cleanPath.startsWith('/attendance/history/'))) {
    return true;
  }

  // 3. Dashboard requires exact match
  if (cleanHref === '/dashboard') {
    return false;
  }

  // 4. Nested route matching: pathname starts with `${cleanHref}/`
  if (cleanPath.startsWith(`${cleanHref}/`)) {
    // Check if another nav item is a better/longer match for this pathname
    const hasMoreSpecificMatch = allItemHrefs.some((otherHref) => {
      const cleanOther = otherHref.length > 1 && otherHref.endsWith('/') ? otherHref.slice(0, -1) : otherHref;
      if (cleanOther === cleanHref) return false;
      if (cleanOther.length <= cleanHref.length) return false;
      return cleanPath === cleanOther || cleanPath.startsWith(`${cleanOther}/`);
    });

    return !hasMoreSpecificMatch;
  }

  return false;
}
