import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "5mb",
			// hosts, not URLs — Next compares against the Origin header's host
			allowedOrigins: ["fahadalsharq.com", "www.fahadalsharq.com", "localhost:3000"],
		},
	},
	eslint: {
		ignoreDuringBuilds: true, // Ignore ESLint errors during build
	},
	allowedDevOrigins: ["fahadalsharq.com"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "koxptzqfmeasndsaecyo.supabase.co",
				pathname: "/storage/v1/object/public/**",
			},
		],
	},
	/* config options here */
};

export default nextConfig;
