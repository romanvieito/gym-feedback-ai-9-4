'use client'
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import App from '@/app/components/App'

export default function Home() {
  const [showApp, setShowApp] = useState(false);

  return (
    <main className="min-h-screen p-8">
      {!showApp ? (
        <>
          <h1 className="text-2xl font-bold mb-6">Exercise Index</h1>
          <div className="grid gap-4">
            <button 
              onClick={() => setShowApp(true)}
              className="p-4 border rounded-lg hover:bg-gray-100 text-left"
            >
              Exercise 1: Interactive App
              <p className="text-sm text-gray-600">Click to toggle the app</p>
            </button>

            <div 
              className="p-4 border rounded-lg cursor-not-allowed opacity-50"
            >
              Exercise 2: Coming Soon
              <p className="text-sm text-gray-600">This exercise is not yet available</p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-8">
          <button 
            onClick={() => setShowApp(false)}
            className="mb-4 text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to index
          </button>
          <App />
        </div>
      )}
    </main>
  );
}
