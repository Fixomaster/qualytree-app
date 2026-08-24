import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    {
      name: 'fmh-icon-inject',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('ForeignManufacturerHub.jsx')) {
          return code.replace(
            "import AppLayout from '../../components/AppLayout'",
            "import { ChevronUp, ChevronDown } from 'lucide-react'\nimport AppLayout from '../../components/AppLayout'\nconst Badge = ({children, className=\'\'}) => React.createElement('span', {className}, children)"
          )
        }
      }
    },
    react()
  ],
  server: {
    host: true,
    port: 5174,
  },
})
