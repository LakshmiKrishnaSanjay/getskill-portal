"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

type UserRole = "student" | "mentor" | "admin"

export default function LoginPage() {
  const router = useRouter()

  const [role, setRole] = useState<UserRole>("student")
  const [email, setEmail] = useState("student@getskill.com")
  const [password, setPassword] = useState("123456")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const demoUsers = {
    student: {
      email: "student@getskill.com",
      password: "123456",
      name: "Student User",
      role: "student",
    },
    mentor: {
      email: "mentor@getskill.com",
      password: "123456",
      name: "Mentor User",
      role: "mentor",
    },
    admin: {
      email: "admin@getskill.com",
      password: "123456",
      name: "Admin User",
      role: "admin",
    },
  }

  const pixels = Array.from({ length: 55 })

  const handleRoleChange = (selectedRole: UserRole) => {
    setRole(selectedRole)
    setEmail(demoUsers[selectedRole].email)
    setPassword(demoUsers[selectedRole].password)
    setError("")
  }

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const selectedUser = demoUsers[role]

    if (email !== selectedUser.email || password !== selectedUser.password) {
      setError("Invalid email or password. Please use the demo credentials.")
      return
    }

    localStorage.setItem("getskill-user", JSON.stringify(selectedUser))
    localStorage.setItem("getskill-role", selectedUser.role)

    router.push("/dashboard")
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#143d8f66,transparent_35%),radial-gradient(circle_at_bottom_right,#54e34533,transparent_35%)]" />

      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-[10%] top-[15%] h-80 w-80 rounded-full bg-[#143d8f] blur-[140px]" />
        <div className="absolute right-[10%] bottom-[10%] h-80 w-80 rounded-full bg-[#54e345] blur-[150px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pixels.map((_, index) => {
          const size =
            index % 9 === 0
              ? 18
              : index % 7 === 0
              ? 14
              : index % 5 === 0
              ? 10
              : index % 3 === 0
              ? 6
              : 4

          const left = `${(index * 13) % 100}%`
          const duration = `${7 + (index % 8)}s`
          const delay = `${index * 0.22}s`
          const opacity =
            index % 8 === 0
              ? 0.95
              : index % 2 === 0
              ? 0.75
              : 0.45

          const color =
            index % 2 === 0 ? "rgba(20, 61, 143, 0.95)" : "rgba(84, 227, 69, 0.95)"

          return (
            <span
              key={index}
              className="absolute top-[-30px] rounded-[2px]"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left,
                opacity,
                backgroundColor: color,
                boxShadow:
                  index % 2 === 0
                    ? "0 0 14px rgba(20, 61, 143, 0.8)"
                    : "0 0 14px rgba(84, 227, 69, 0.7)",
                animation: `pixelFall ${duration} linear infinite`,
                animationDelay: delay,
              }}
            />
          )
        })}
      </div>

      <div className="relative z-10 w-full max-w-[800px] grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_0_80px_rgba(20,61,143,0.18)]">
        <div className="hidden lg:flex flex-col justify-between p-7 text-white border-r border-white/10">
          <div>
            <div className="w-44 mb-6  p-3">
              <Image
                src="/pixel-pluz-logo.svg"
                alt="Pixel Pluz Logo"
                width={150}
                height={55}
                priority
              />
            </div>

            <h1 className="text-3xl font-bold leading-tight mb-4">
              GetSkill Student Portal
            </h1>

            <p className="text-white/70 text-base leading-7 max-w-md">
              A smart portal for students, mentors, and admins to manage
              learning progress, tasks, submissions, reviews, and attendance.
            </p>
          </div>


        </div>

        <div className="p-6 sm:p-8">
          <div className="lg:hidden mb-8">
            <Image
              src="/pixel-pluz-logo.svg"
              alt="Pixel Pluz Logo"
              width={160}
              height={60}
              priority
            />
          </div>

          <div className="mb-8">
            <p className="text-[#4f8cff] text-sm font-semibold mb-2">
              Welcome Back
            </p>
            <h2 className="text-3xl font-bold text-white">
              Login to Portal
            </h2>
            <p className="text-white/50 mt-2">
              Select your role and enter demo credentials.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleRoleChange("student")}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                role === "student"
                  ? "bg-[#143d8f] text-white border-[#143d8f] shadow-[0_0_20px_rgba(20,61,143,0.35)]"
                  : "bg-white/5 text-white/70 border-white/10 hover:border-[#143d8f]"
              }`}
            >
              Student
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("mentor")}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                role === "mentor"
                  ? "bg-[#143d8f] text-white border-[#143d8f] shadow-[0_0_20px_rgba(20,61,143,0.35)]"
                  : "bg-white/5 text-white/70 border-white/10 hover:border-[#143d8f]"
              }`}
            >
              Mentor
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("admin")}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                role === "admin"
                  ? "bg-[#143d8f] text-white border-[#143d8f] shadow-[0_0_20px_rgba(20,61,143,0.35)]"
                  : "bg-white/5 text-white/70 border-white/10 hover:border-[#143d8f]"
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#143d8f] focus:ring-2 focus:ring-[#143d8f]/20"
                placeholder="Enter email"
              />
            </div>
<div>
  <label className="block text-sm font-medium text-white/70 mb-2">
    Password
  </label>

  <div className="relative">
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 pr-12 text-white outline-none placeholder:text-white/30 focus:border-[#143d8f] focus:ring-2 focus:ring-[#143d8f]/20"
      placeholder="Enter password"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <EyeOff size={20} strokeWidth={2} />
      ) : (
        <Eye size={20} strokeWidth={2} />
      )}
    </button>
  </div>
</div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-[#143d8f] px-4 py-3 font-semibold text-white transition hover:bg-[#1d4fb3] hover:shadow-[0_0_30px_rgba(20,61,143,0.45)]"
            >
              Login to Portal
            </button>
          </form>

        </div>
      </div>

      <style jsx>{`
        @keyframes pixelFall {
          0% {
            transform: translateY(-40px) rotate(0deg);
          }
          100% {
            transform: translateY(115vh) rotate(220deg);
          }
        }
      `}</style>
    </main>
  )
}