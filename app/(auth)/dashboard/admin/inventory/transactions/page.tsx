import { withRole } from "@/lib/page-guard";
import InventoryTransactionsPage from "@/app/(auth)/dashboard/components/InventoryTransactionsPage";

export default withRole(["ADMIN"], InventoryTransactionsPage);
