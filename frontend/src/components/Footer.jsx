import { ShieldCheck } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-white mt-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
          <ShieldCheck size={18} className="text-green-600" />
          <span>Hello World © 2025</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer