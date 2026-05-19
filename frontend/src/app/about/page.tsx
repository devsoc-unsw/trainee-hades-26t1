"use client";
import React from "react"
import Image from "next/image";
import Link from "next/link";

export default function About() {
  return (
    <div className="text-center mt-45">
      <h1 className="text-7xl font-bold" style={{ color: "var(--dark-blue)" }}>
        {" "}
        About StudyNook.
      </h1>
      <p
        className="font-mono font-bold text-shadow-lg text-2xl mt-3"
        style={{ color: "var(--pastel-yellow)" }}
      >
        {" "}
        Do it Together.
      </p>

      <div className="flex justify-center gap-5 text-sm mt-10">
        <Link
          href="/register"
          className="font-bold font-mono pl-6 pr-6 p-3 border rounded-xl inline text-(--background) bg-(--dark-blue) border-(--dark-blue)"
        >
          Get Started
        </Link>
        <Link
          // TODO: link to where?
          href="/about"
          className="font-mono pl-6 pr-6 p-3 border rounded-xl inline bg-(--background) border-(--dark-blue)"
        >
          Learn More
        </Link>
      </div>

      <div>
        <Image
          src="/assets/cloud1.jpg"
          alt=""
          width={300}
          height={200}
          className="w-[15vw] max-w-40 absolute top-[5em] left-[10em] object-contain"
        />
        <Image
          src="/assets/cloud1.jpg"
          alt=""
          width={300}
          height={200}
          className="w-[15vw] max-w-40 absolute top-[15em] right-[15em] object-contain"
        />
        <Image
          src="/assets/stars.png"
          alt=""
          width={300}
          height={200}
          className="w-[15vw] max-w-40 absolute top-[7vh] right-[30vw] object-contain"
        />
      </div>
      <div className="flex justify-between items-end px-[10vw] mt-12 relative z-10">
        <Image
          src="/assets/window1.PNG"
          alt="Window 1"
          width={300}
          height={200}
          className="w-[18vw] max-w-52 object-contain"
        />
        <Image
          src="/assets/window2.PNG"
          alt="Window 2"
          width={300}
          height={200}
          className="w-[18vw] max-w-52 object-contain"
        />
        <Image
          src="/assets/window3.jpg"
          alt="Window 3"
          width={300}
          height={200}
          className="w-[18vw] max-w-52 object-contain"
        />
      </div>
    </div>
  );
}