"use client";

import Image from "next/image";
import Link from "next/link";

export default function Landing() {
  return (
    <div className="text-center mt-45">
      <style>{`
        @keyframes driftLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes floatBob {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(14px) scale(0.97); }
        }
        .clouds-track-left {
          display: flex;
          width: 200%;
          animation: driftLeft 30s linear infinite;
        }
        .stars-bounce {
          animation: floatBob 4s ease-in-out infinite;
        }
      `}</style>

      <h1 className="text-7xl font-bold text-(--dark-blue)">
        {" "}
        StudyNook.
      </h1>
      <p className="font-mono font-bold text-shadow-lg text-2xl mt-3 text-(--pastel-yellow)">
        {" "}
        Do it Together.
      </p>

      <div className="flex justify-center gap-5 text-sm mt-10">
        <Link
          href="/register"
          className="font-bold font-mono pl-6 pr-6 p-3 border rounded-xl inline text-background bg-(--dark-blue) border-(--dark-blue)"
        >
          Get Started
        </Link>
        <Link
          href="/about"
          className="font-mono pl-6 pr-6 p-3 border rounded-xl inline bg-background border-(--dark-blue)"
        >
          Learn More
        </Link>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[2em] left-0 w-full overflow-hidden">
          <div className="clouds-track-left flex items-end">
            <div className="flex w-1/2 justify-around items-end">
              <Image src="/assets/cloud1.jpg" alt="" width={300} height={200} className="w-[15vw] max-w-40 object-contain self-start" />
              <Image src="/assets/cloud1.jpg" alt="" width={300} height={200} className="w-[15vw] max-w-40 object-contain opacity-70 self-end mt-10" />
            </div>
            <div className="flex w-1/2 justify-around items-end">
              <Image src="/assets/cloud1.jpg" alt="" width={300} height={200} className="w-[15vw] max-w-40 object-contain self-start" />
              <Image src="/assets/cloud1.jpg" alt="" width={300} height={200} className="w-[15vw] max-w-40 object-contain opacity-70 self-end mt-10" />
            </div>
          </div>
        </div>

        <Image
          src="/assets/stars.png"
          alt=""
          width={300}
          height={200}
          className="stars-bounce w-[15vw] max-w-40 absolute top-[7vh] right-[30vw] object-contain"
        />
      </div>

      <div className="flex justify-between items-end px-[10vw] mt-12 relative z-10">
        <Image src="/assets/window1.PNG" alt="Window 1" width={300} height={200} className="w-[18vw] max-w-52 object-contain" />
        <Image src="/assets/window2.PNG" alt="Window 2" width={300} height={200} className="w-[18vw] max-w-52 object-contain" />
        <Image src="/assets/window3.jpg" alt="Window 3" width={300} height={200} className="w-[18vw] max-w-52 object-contain" />
      </div>
    </div>
  );
}