/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { Pixelify_Sans, Poppins } from "next/font/google";

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthPageShell({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  footer,
  children,
}: AuthPageShellProps) {
  return (
    <main className="h-screen bg-[var(--light-blue)] px-4 py-6 sm:px-5 md:px-8 tracking-[0.08em] overflow-y-hidden">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-6/7 max-w-7xl items-center gap-8 lg:grid-cols-2 px-0">
        <div className="relative hidden h-full w-full items-center justify-center lg:flex">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border-4 border-[#FFFCD6] bg-[#FFFCD6] aspect-square">
            <img
              src="/cloud.png"
              alt="cloud-left"
              className="pointer-events-none absolute -bottom-70 -left-50 h-[45rem] w-[45rem] scale-50 object-contain sm:scale-75 lg:scale-100"
            />
            <img
              src={imageSrc}
              alt={imageAlt}
              className="h-full w-full object-contain"
            />
            <img
              src="/cloud.png"
              alt="cloud-right"
              className="pointer-events-none absolute -bottom-70 -right-50 h-[45rem] w-[45rem] scale-50 object-contain sm:scale-75 lg:scale-100"
            />
          </div>
        </div>

        <section className={`w-full max-w-xl mx-auto lg:mx-0 ${poppins.className}`}>
          <div className="relative h-30">
            <img
              src="/star.png"
              alt="star"
              className="absolute right-0 top-0 w-36"
            />
          </div>

          <h1
            className={`${pixelify.className} mb-4 text-5xl font-black leading-none text-[var(--dark-blue)] tracking-[0.08em]`}
          >
            {title}
          </h1>

          <p className="text-lg sm:text-xl text-[var(--dark-blue)] mb-5">{subtitle}</p>
            {children}
          <div className="mt-8 text-center text-base text-md text-[var(--dark-blue)]">
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
