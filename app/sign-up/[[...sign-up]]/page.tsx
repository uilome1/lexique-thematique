'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-500">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-2xl"
          }
        }}
      />
    </div>
  )
}