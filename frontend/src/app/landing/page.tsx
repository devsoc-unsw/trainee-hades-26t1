import Image from "next/image";

export default function Landing() {
  return <div className="text-center mt-45">
    <h1 className="text-7xl font-bold" style={{ color: 'var(--dark-blue)'}}> StudyNook.</h1>
    <p className="font-mono font-bold text-shadow-lg text-2xl mt-3"style={{color: 'var(--pastel-yellow)'}}> Do it Together.</p>

    <div className="flex justify-center gap-5 text-sm mt-10">
        <p 
            className="font-bold font-mono pl-6 pr-6 p-3 border rounded-xl inline" 
            style={{ 
                color: 'var(--background)', 
                backgroundColor: 'var(--dark-blue)', 
                borderColor: 'var(--dark-blue)' 
            }}
        >  
            Get Started</p>
        <p 
            className="font-mono pl-6 pr-6 p-3 border rounded-xl inline"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--dark-blue)' }}
        > 
            Learn More</p>
    </div>


    <div>
        <Image 
            src="/assets/cloud1.jpg" 
            alt=""
            width={300}
            height={200}
            className="w-[15vw] max-w-[10rem] absolute top-[5em] left-[10em] object-contain"
        />
        <Image 
            src="/assets/cloud1.jpg" 
            alt=""
            width={300}
            height={200}
            className="w-[15vw] max-w-[10rem] absolute top-[15em] right-[15em] object-contain"
        />
        <Image 
            src="/assets/stars.png" 
            alt=""
            width={300}
            height={200}
            className="w-[15vw] max-w-[10rem] absolute top-[7vh] right-[30vw] object-contain"
        />
        <Image 
            src="/assets/window1.PNG" 
            alt=""
            width={300}
            height={200}
            className="w-[18vw] max-w-[13rem] absolute bottom-[9vh] left-[10vw] object-contain"
        />
        <Image 
            src="/assets/window2.PNG" 
            alt=""
            width={300}
            height={200}
            className="w-[18vw] max-w-[13rem] absolute bottom-[9vh] left-1/2 -translate-x-1/2 object-contain"
        />
        <Image 
            src="/assets/window3.jpg" 
            alt=""
            width={300}
            height={200}
            className="w-[18vw] max-w-[13rem] absolute bottom-[9vh] right-[10vw] object-contain"
        />
    </div>


  </div>;
}
