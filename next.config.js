/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // PDF.js 관련 경고 무시
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
      { module: /node_modules\/react-pdf/ },
      { module: /node_modules\/pdfjs-dist/ }
    ]
    
    return config
  }
}

module.exports = nextConfig
