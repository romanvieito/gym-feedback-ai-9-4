/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/py/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/py/:path*"
            : "/api/",
      },
      {
        source: "/docs",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/py/docs"
            : "/api/py/docs",
      },
      {
        source: "/openapi.json",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/py/openapi.json"
            : "/api/py/openapi.json",
      },
    ];
  },
  // New experimental configuration
  experimental: {
    outputFileTracingIgnores: ['public/videos/*']
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,  // preserve any existing fallback configs
      fs: false,
      path: false,
      crypto: false
    };
    
    return config;
  }
};

module.exports = nextConfig;
