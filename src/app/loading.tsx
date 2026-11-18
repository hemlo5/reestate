export default function RootLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
      <div className="space-y-3 max-w-2xl">
        <div className="h-4 w-36 rounded-lg bg-[#EEF3FF]" />
        <div className="h-10 w-3/4 rounded-2xl bg-[#F2F4F8]" />
        <div className="h-4 w-2/3 rounded-lg bg-[#F7F8FA]" />
      </div>
      <div className="h-32 rounded-3xl bg-[#F7F8FA] border border-[#E6E9EF]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-80 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]"
          />
        ))}
      </div>
    </div>
  );
}
