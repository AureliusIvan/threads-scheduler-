'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar,
  BarChart3,
  Image,
  Clock,
  Zap,
  Users,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Schedule your Threads posts for optimal engagement times. Never miss posting again.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Track your performance with detailed analytics. Understand what works best.',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Image,
      title: 'Media Management',
      description: 'Organize your images and videos in one place. Reuse content efficiently.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Zap,
      title: 'Bulk Operations',
      description: 'Schedule multiple posts at once. Save time with batch operations.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Content Creator',
      content: 'ThreadsScheduler has transformed how I manage my content. The scheduling feature is a game-changer!',
      avatar: '👩‍💻',
    },
    {
      name: 'Mike Johnson',
      role: 'Social Media Manager',
      content: 'The analytics insights help me understand my audience better. Highly recommended!',
      avatar: '👨‍💼',
    },
    {
      name: 'Lisa Park',
      role: 'Influencer',
      content: 'Clean interface, powerful features. Everything I need to grow my Threads presence.',
      avatar: '🌟',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 md:justify-start md:space-x-10">
            <div className="flex justify-start lg:w-0 lg:flex-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TS</span>
                </div>
                <span className="text-xl font-bold text-gray-900">ThreadsScheduler</span>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0 space-x-4">
              <Link
                href="/auth/signin"
                className="whitespace-nowrap text-base font-medium text-gray-500 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Button variant="primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Schedule Your Threads Posts
              <br />
              Like a Pro
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Take control of your Threads presence with powerful scheduling, analytics, 
              and content management tools. Grow your audience while saving time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-blue-600">
                <Link href="/auth/signin" className="flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help content creators, marketers, and businesses 
              maximize their Threads impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    <div className={`inline-flex p-3 rounded-full ${feature.bgColor} mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why choose ThreadsScheduler?
              </h2>
              <div className="space-y-4">
                {[
                  'Schedule posts when your audience is most active',
                  'Track performance with detailed analytics',
                  'Manage all your media in one organized library',
                  'Optimize content strategy with insights',
                  'Save hours of manual posting every week',
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:pl-8">
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-1 text-yellow-500 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4">
                      "ThreadsScheduler has completely transformed how I manage my content. 
                      The insights are incredible and the scheduling feature saves me hours every week."
                    </p>
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        JD
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Jane Doe</p>
                        <p className="text-sm text-gray-600">Content Creator</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by creators worldwide
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied users who trust ThreadsScheduler
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 text-yellow-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your Threads strategy?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of creators who are already scheduling smarter and growing faster.
          </p>
          <Button size="lg" variant="secondary" className="text-blue-600">
            <Link href="/auth/signin" className="flex items-center">
              Start Free Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-blue-200 mt-4">
            No credit card required • Free forever plan available
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TS</span>
              </div>
              <span className="text-xl font-bold text-white">ThreadsScheduler</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-400 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white">
                Terms
              </Link>
              <Link href="/support" className="text-gray-400 hover:text-white">
                Support
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              © 2024 ThreadsScheduler. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
