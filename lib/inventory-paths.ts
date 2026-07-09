// Admin's inventory pages live under /dashboard/admin/inventory/*, while the
// inventory manager's live directly under /dashboard/inventory_manager/*.
// Shared inventory components must build links through this helper.
export function inventoryBasePath(role?: string): string {
	return role === "admin" ? "/dashboard/admin/inventory" : "/dashboard/inventory_manager";
}
