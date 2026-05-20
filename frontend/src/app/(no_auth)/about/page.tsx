"use client";
import React from "react"
import Image from "next/image";
import Link from "next/link";

export default function About() {
  return (
    <div className="text-center mt-45">
      <h1 className="text-5xl font-bold" style={{ color: "var(--dark-blue)" }}>
        {" "}
        About StudyNook.
      </h1>
      <p
        className="font-mono font-bold text-shadow-lg text-2xl mt-3"
        style={{ color: "var(--pastel-yellow)" }}
      >
        {" "}
        Doing it Together
      </p>

      <div className="flex justify-center gap-5 text-sm mt-10">
        <Link
          href="/register"
          className="font-bold font-mono pl-6 pr-6 p-3 border rounded-xl inline text-(--background) bg-(--dark-blue) border-(--dark-blue)"
        >
          Register here
        </Link>
        <Link
          // TODO: link to where?
          href="/login"
          className="font-mono pl-6 pr-6 p-3 border rounded-xl inline bg-(--background) border-(--dark-blue)"
        >
          Already have an account?
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
      <div className="flex justify-center items-end px-[10vw] mt-12 relative z-10">
        {/* <Image
          src="/assets/window1.PNG"
          alt="Window 1"
          width={300}
          height={200}
          className="w-[18vw] max-w-52 object-contain"
        /> */}
				<div className="relative">
					<Image
						src="/assets/pen-scroll.png"
						alt="scroll about"
						width={600}
						height={600}
						className="w-[200vw] max-w-150 object-contain"
					/>
					<p
						className="absolute font-semibold text-md max-w-[100vw] shadow-none"
						style={{ color: "var(--dark-blue)", top: "15%", left: "50%", transform: "translate(-50%, 0%)" }}
					>
						{" "}
						Studynook is a Social study platform built around a 2D interactive map which promotes productivity and light social interaction.
            {" "}
            <span className="flexmb-10"/>
            Users can set and customise their room's study topic, and engage with multipler users through interactive pixel sprites inspired by gamification.
            {" "}
            <br/>
            Each room contains a pomodoro and task list, with random bonding questions and chats during breaks to maintain user engagement.
					</p>

				</div>
        {/* <Image
          src="/assets/window3.jpg"
          alt="Window 3"
          width={300}
          height={200}
          className="w-[18vw] max-w-52 object-contain"
        /> */}
      </div>
    </div>
  );
}