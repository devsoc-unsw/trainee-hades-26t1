"use client";
import { useState, FormEvent, ChangeEvent } from "react";
import { Pixelify_Sans, Poppins } from 'next/font/google';
import { JSX } from "react/jsx-runtime";
import { useRouter } from 'next/navigation';

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export default function Login(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const route = useRouter();

  const handleSubmit = (e: any) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-[var(--light-blue)] p-5 tracking-[0.08em]">
      <div className="mx-auto flex min-h-[90vh] w-full max-w-[1360px] flex-col items-center justify-center px-8 py-10 lg:flex-row lg:justify-between lg:px-14">
        
      {/* LEFT */}
      <div className="relative flex items-center justify-center w-[590px] h-[588px] shrink-0">
        <img
          src="/cloud.png"
          alt="cloud-left"
          className="pointer-events-none absolute bottom-[-350] left-[-290px] h-[729px] w-[1049px] scale-125 object-contain"
        />

        <div className="w-[577px] h-[577px] bg-[#FFFCD6] rounded-[25px] overflow-hidden">
          <img
            src="/login-left.jpg"
            alt="pixel room"
            className="w-full h-full object-contain border-[5px] border-[#FFFCD6] rounded-[25px]"
          />
        </div>

        <img
          src="/cloud.png"
          alt="cloud-right"
          className="pointer-events-none absolute bottom-[-350px] right-[-270px] h-[729px] w-[1049px] scale-125 object-contain"
        />
      </div>

        {/* RIGHT */}
        <div className={`w-full max-w-[540px] ${poppins.className}`}>
          
          {/* Decorations */}
          <div className="relative mb-6 h-[120px]">
            <img
              src="/star.png"
              alt="star"
              className="absolute right-[-10px] top-0 w-[209px]"
            />
          </div>

          <h1 className={`${pixelify.className} mb-4 text-[96px] font-black text-[var(--dark-blue)] tracking-[0.08em]`}>
            Sign In !!!
          </h1>

          <p className="mb-10 text-[20px] text-[var(--dark-blue)]">
            Welcome back :D
          </p>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-9">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              className="h-[82px] w-full rounded-2xl bg-[#5F7B9340] px-7 text-[18px] outline-none"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              className="h-[82px] w-full rounded-2xl bg-[#5F7B9340] px-7 text-[18px] outline-none"
              required
            />

            <a
              type="button"
              className="text-[18px] font-semibold text-[#627a94] "
            >
              Forgot Password?
            </a>

            <button
              type="submit"
              className="h-[82px] w-full rounded-2xl bg-[var(--dark-blue)] text-[20px] mt-[15px] font-bold text-white hover:opacity-90"
            >
              Sign in
            </button>
          </form>

          <p className="mt-14 text-center text-[18px] text-[var(--dark-blue)]">
            Don’t have an account?{" "}
            <a href="#" className="font-bold underline"
            onClick={(e) => {
              e.preventDefault()
              route.push('/register')
            }}
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}