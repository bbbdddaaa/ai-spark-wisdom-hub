import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: 'localhost',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // 确保 VITE_ 开头的环境变量被正确加载
      envPrefix: 'VITE_',
      
      // 构建优化配置
      build: {
        // 代码分割 - 将大型依赖拆分成独立 chunk
        rollupOptions: {
          output: {
            manualChunks: {
              // 将 React 相关库单独打包
              'react-vendor': ['react', 'react-dom'],
              // 将区块链相关库单独打包（最大的依赖）
              'web3-vendor': ['viem', 'wagmi'],
              // 将 UI 库单独打包
              'ui-vendor': ['lucide-react', 'recharts'],
              // Supabase 单独打包
              'supabase-vendor': ['@supabase/supabase-js'],
            },
          },
        },
        // 启用 gzip 大小报告
        reportCompressedSize: true,
        // chunk 大小警告限制（KB）
        chunkSizeWarningLimit: 600,
        // 压缩优化
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true, // 生产环境移除 console
            drop_debugger: true,
          },
        },
      },
    };
});
