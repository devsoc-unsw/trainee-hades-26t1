export function alarm(src: string, duration?: number) {
  const play = () => {
    const audio = new Audio(src);
    audio.volume = 1.0;
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

export function click(src: string) {
  const play = () => {
    const audio = new Audio(src);
    audio.volume = 1.0;
    audio.play();
  };
  return play;
}

export function click2(src: string) {
  const play = () => {
    const audio = new Audio(src);
    audio.volume = 1.0;
    audio.play();
  };
  return play;
}