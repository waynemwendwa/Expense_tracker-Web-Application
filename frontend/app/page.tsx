'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  CreditCard,
  Receipt,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { ThreeDMarquee } from '@/components/ui/3d-marquee'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const features = [
    {
      icon: CreditCard,
      title: 'Smart Budget Management',
      description: 'Link your cards and set spending limits with intelligent budget tracking.'
    },
    {
      icon: Receipt,
      title: 'Receipt Scanning',
      description: 'Simply take a photo of your receipt and let AI extract all the details automatically.'
    },
    {
      icon: BarChart3,
      title: 'Visual Analytics',
      description: 'Beautiful charts and insights to understand your spending patterns.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Bank-level security with end-to-end encryption for your financial data.'
    },
    {
      icon: Zap,
      title: 'Real-time Notifications',
      description: 'Get instant alerts when you approach your budget limits.'
    },
    {
      icon: TrendingUp,
      title: 'Financial Insights',
      description: 'AI-powered insights to help you make better financial decisions.'
    }
  ]

  const benefits = [
    'Track expenses automatically with receipt scanning',
    'Set and monitor multiple budgets',
    'Get real-time spending alerts',
    'Visualize your financial health',
    'Secure and private data handling',
    'Mobile-friendly interface'
  ]


   const images = [
    "https://assets.aceternity.com/cloudinary_bkp/3d-card.png",
    "https://assets.aceternity.com/animated-modal.png",
    "https://assets.aceternity.com/animated-testimonials.webp",
    "https://assets.aceternity.com/cloudinary_bkp/Tooltip_luwy44.png",
    "https://assets.aceternity.com/github-globe.png",
    "https://assets.aceternity.com/glare-card.png",
    "https://assets.aceternity.com/layout-grid.png",
    "https://assets.aceternity.com/flip-text.png",
    "https://assets.aceternity.com/hero-highlight.png",
    "https://assets.aceternity.com/carousel.webp",
    "https://assets.aceternity.com/placeholders-and-vanish-input.png",
    "https://assets.aceternity.com/shooting-stars-and-stars-background.png",
    "https://assets.aceternity.com/signup-form.png",
    "https://assets.aceternity.com/cloudinary_bkp/stars_sxle3d.png",
    "https://assets.aceternity.com/spotlight-new.webp",
    "https://assets.aceternity.com/cloudinary_bkp/Spotlight_ar5jpr.png",
    "https://assets.aceternity.com/cloudinary_bkp/Parallax_Scroll_pzlatw_anfkh7.png",
    "https://assets.aceternity.com/tabs.png",
    "https://assets.aceternity.com/cloudinary_bkp/Tracing_Beam_npujte.png",
    "https://assets.aceternity.com/cloudinary_bkp/typewriter-effect.png",
    "https://assets.aceternity.com/glowing-effect.webp",
    "https://assets.aceternity.com/hover-border-gradient.png",
    "https://assets.aceternity.com/cloudinary_bkp/Infinite_Moving_Cards_evhzur.png",
    "https://assets.aceternity.com/cloudinary_bkp/Lamp_hlq3ln.png",
    "https://assets.aceternity.com/macbook-scroll.png",
    "https://assets.aceternity.com/cloudinary_bkp/Meteors_fye3ys.png",
    "https://assets.aceternity.com/cloudinary_bkp/Moving_Border_yn78lv.png",
    "https://assets.aceternity.com/multi-step-loader.png",
    "https://assets.aceternity.com/vortex.png",
    "https://assets.aceternity.com/wobble-card.png",
    "https://assets.aceternity.com/world-map.webp",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="relative z-10">
        <nav className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-blue-500">ExpenseTracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
                className="text-white hover:text-gray-900"
              >
                Sign In
              </Button>
              <Button
                onClick={() => router.push('/register')}
                className="bg-primary-600 hover:bg-primary-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
     
      
        <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-700 mb-6">
            Take Control of Your
            <span className="text-gray-700"> Finances</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The smart expense tracker that helps you manage budgets, scan receipts,
            and gain insights into your spending habits with beautiful visualizations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => router.push('/register')}
              className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-4"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/login')}
              className="text-lg px-8 py-4"
            >
              Sign In
            </Button>
          </div>
        </div>
        {/* <div className="absolute inset-0 z-10 h-full w-full bg-black/10 dark:bg-black/40"/> */}
       
         
      </section >

    {/* Features Section */ }
    < section className = "container mx-auto px-4 py-20" >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-700 mb-4">
            Everything You Need to Manage Your Money
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to make expense tracking simple, secure, and insightful.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section >

    {/* Benefits Section */ }
    < section className = "bg-gray-50 py-20" >
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose ExpenseTracker?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of users who have transformed their financial management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            {benefits.slice(0, 3).map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {benefits.slice(3).map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </section >

    {/* CTA Section */ }
    < section className = "container mx-auto px-4 py-20" >
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Ready to Transform Your Financial Life?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Start tracking your expenses today and take the first step towards better financial health.
        </p>
        <Button
          size="lg"
          onClick={() => router.push('/register')}
          className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-4"
        >
          Get Started for Free
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
      </section >

    {/* Footer */ }
    < footer className = "bg-gray-900 text-white py-12" >
      <div className="container mx-auto px-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">ExpenseTracker</span>
        </div>
        <p className="text-gray-400 mb-4">
          Smart expense tracking for a better financial future.
        </p>

               {/* <ThreeDMarquee
          className="pointer-events-none absolute inset-0 h-full w-full"
          images={images}
        /> */}
      </div>
      </footer >
    </div >
  )
}
