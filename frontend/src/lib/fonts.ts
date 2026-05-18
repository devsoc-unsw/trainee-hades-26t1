import { Pixelify_Sans, Poppins } from "next/font/google";

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
});