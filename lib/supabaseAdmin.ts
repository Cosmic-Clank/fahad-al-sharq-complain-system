// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdminClient = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PRIVATE_SUPABASE_SECRET_DEFAULT_KEY! // NOT exposed to the client!
);

export default supabaseAdminClient;
