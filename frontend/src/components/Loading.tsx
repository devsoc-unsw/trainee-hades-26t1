export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex gap-2">
                <div className="w-4 h-4 bg-(--dark-blue) rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                <div className="w-4 h-4 bg-(--dark-blue) rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-4 h-4 bg-(--dark-blue) rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
            <p className="text-(--dark-blue) text-lg font-(family-name:--font-pixelify) tracking-widest">
                Loading...
            </p>
        </div>
    );
}
