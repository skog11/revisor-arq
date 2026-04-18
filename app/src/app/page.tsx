import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      
      <main className="flex flex-col items-center space-y-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-mono tracking-tighter">
          REVISOR ARQ
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-[600px]">
          Normativa urbana chilena, respondida con fuentes verificables
        </p>
      </main>
    </div>
  );
}
