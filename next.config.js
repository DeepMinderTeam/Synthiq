/** @type {import('next').NextConfig} */
const nextConfig = {
  // 성능 최적화 설정
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react'],
    // 개발 서버 최적화
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 개발 서버 최적화
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  
  // TypeScript 최적화
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint 최적화
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  webpack: (config, { isServer, dev }) => {
    // PDF.js 관련 경고 무시
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
      { module: /node_modules\/react-pdf/ },
      { module: /node_modules\/pdfjs-dist/ }
    ]
    
    // 개발 모드에서 성능 최적화
    if (dev) {
      // 소스맵 최적화
      config.devtool = 'eval-cheap-module-source-map'
      
      // 캐시 최적화
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
    }
    
    // 번들 크기 최적화
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
          },
        },
      }
    }
    
    return config
  }
}

module.exports = nextConfig
