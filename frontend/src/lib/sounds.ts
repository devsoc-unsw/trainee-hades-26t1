export function alarm(src: string, duration?: number) {
  const play = () => {
    const audio = new Audio(src);
    audio.volume = 0.5;
    audio.play();
    if (duration) {
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, duration);
    }
  };
  return play;
}