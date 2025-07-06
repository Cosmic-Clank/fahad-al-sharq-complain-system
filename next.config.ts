import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "5mb",
		},
	},
	eslint: {
		ignoreDuringBuilds: true, // Ignore ESLint errors during build
	},
	/* config options here */
};

export default nextConfig;
