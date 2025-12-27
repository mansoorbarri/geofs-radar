export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-3 bg-neutral-950 text-neutral-200">
      <div className="flex items-center space-x-2">
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:0.15s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:0.3s]"></div>
      </div>
      <p className="text-sm font-light tracking-wider uppercase">Loading</p>
    </div>
  );
}
