import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "5mb",
			allowedOrigins: ["http://fahadalsharq.com", "http://localhost"],
		},
	},
	eslint: {
		ignoreDuringBuilds: true, // Ignore ESLint errors during build
	},
	allowedDevOrigins: ["http://fahadalsharq.com"],
	/* config options here */
};

export default nextConfig;
