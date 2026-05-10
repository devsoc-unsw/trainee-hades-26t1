"use client";
import { useState, FormEvent, ChangeEvent } from "react";
import { Pixelify_Sans, Poppins } from 'next/font/google';
import { JSX } from "react/jsx-runtime";
import { useRouter } from "next/navigation";
import router from "next/router";

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export default function Register() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const router = useRouter();

  return (

    <div className="min-h-screen flex items-center justify-center">
      <div
      className={`relative w-full max-w-[1440px] min-h-screen flex items-center justify-center gap-[91px] px-10 ${poppins.className} tracking-[0.08em]`}
    >
      {/* LEFT */}
      <div className="relative flex items-center justify-center w-[590px] h-[588px] shrink-0">
        <img
          src="/cloud.png"
          alt="cloud-left"
          className="pointer-events-none absolute bottom-[-350] left-[-290px] h-[729px] w-[1049px] scale-125 object-contain"
        />

        <div className="w-[590px] h-[588px] bg-[#FFFCD6] rounded-[25px] overflow-hidden">
          <img
            src="/9a1762f5a9668b3a87bb6b6f828eb28a8e10882c.jpg"
            alt="pixel room"
            className="w-full h-full object-contain border-[5px] border-[#FFFCD6] rounded-[25px]"
          />
        </div>

        <img
          src="/cloud.png"
          alt="cloud-right"
          className="pointer-events-none absolute bottom-[-350px] right-[-290px] h-[729px] w-[1049px] scale-125 object-contain"
        />
      </div>

      {/* RIGHT */}
      <div className="w-[554px] shrink-0 text-[20px]">

        {/* Decorations */}
        <div className="relative mb-6 h-[120px]">
          <img
            src="/star.png"
            alt="star"
            className="absolute right-[-10px] top-0 w-[209px]"
          />
        </div>

        <div className={`${pixelify.className} text-[96px] mb-[15px] text-[var(--dark-blue)]`}>
          Register
        </div>

        <div className="text-[20px] mb-[34px] text-[#5F7B93] ">
          Welcome to the club :)
        </div>

        <form className="tracking-[0.08em]">
          <input
            type="email"
            placeholder="Email"
            value={email}
            className="w-[554px] h-[87px] bg-[#5F7B9340] rounded-[12px] mb-[38px] px-6 opacity-75"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-[554px] h-[87px] bg-[#5F7B9340] rounded-[12px] mb-[38px] px-6 opacity-75"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <select
            className="cursor-pointer w-[554px] h-[87px] bg-[#5F7B9380] rounded-[12px] mb-[38px] text-center text-white font-bold"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
          >
            <option value="" disabled>
              Your School
            </option>
            <option value="Usyd">Usyd</option>
            <option value="UNSW">UNSW</option>
          </select>

          <button
            type="submit"
            className="cursor-pointer w-[554px] h-[87px] bg-[#5F7B93] rounded-[12px] font-bold mb-[68px] text-white hover:opacity-90"
          >
            Create Account
          </button>
        </form>

        <div className="text-center text-[18px] text-[var(--dark-blue)]">
          Have an account?{" "}
          <a
            href="#"
            className="font-bold underline"
            onClick={(e) => {
              e.preventDefault();
              router.push("/login");
            }}
          >
            Log in here
          </a>
        </div>
      </div>
    </div>
  </div>
    
  );
}
